import ContentKit
import CoreModels
import StudyEngines
import SwiftUI

/// The home screen every app in the family shares: the module's five core
/// features (study, quiz, flashcards, mock, timed exam) built entirely from the
/// module's content. There is no per-module UI code anywhere — this screen IS
/// the white-label surface.
struct ModuleHomeView: View {
    let content: ModuleContent

    private var bankTitles: [String: String] {
        Dictionary(uniqueKeysWithValues: content.quiz.banks.map { ($0.id, $0.title) })
    }

    var body: some View {
        List {
            if let groundSchool = content.groundSchool {
                Section("Study") {
                    ForEach(groundSchool.modules) { module in
                        NavigationLink(module.title) {
                            LessonListScreen(module: module)
                        }
                    }
                }
            }
            Section("Quiz by topic") {
                ForEach(content.quiz.banks) { bank in
                    NavigationLink {
                        QuizScreen(
                            title: bank.title,
                            session: StudySession(questions: bank.questions, config: .practice),
                            bankTitles: bankTitles
                        )
                    } label: {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(bank.title)
                            Text("\(bank.questions.count) questions")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
            Section("Flashcards") {
                ForEach(content.quiz.banks) { bank in
                    NavigationLink(bank.title) {
                        FlashcardsScreen(bank: bank)
                    }
                }
            }
            Section("Exam") {
                NavigationLink("Mock exam (untimed)") {
                    QuizScreen(
                        title: "Mock exam",
                        session: StudySession(
                            questions: QuestionSampler.draw(
                                from: content.quiz.banks, count: content.exam.questionCount),
                            config: .mock(content.exam)),
                        bankTitles: bankTitles
                    )
                }
                NavigationLink("Timed exam — \(content.exam.minutes) min, pass \(content.exam.passMark)%") {
                    ExamScreen(content: content, bankTitles: bankTitles)
                }
            }
            Section {
                Disclaimer()
            }
        }
    }
}

/// Read-only lesson list (full lesson bodies + Captain Adel hooks come in P2).
struct LessonListScreen: View {
    let module: GSModule

    var body: some View {
        List {
            Section {
                Text(module.summary)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            ForEach(module.lessons) { lesson in
                VStack(alignment: .leading, spacing: 4) {
                    Text(lesson.title).font(.headline)
                    Text(lesson.objective)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .padding(.vertical, 2)
            }
        }
        .navigationTitle(module.title)
    }
}

struct QuizScreen: View {
    let title: String
    @State var session: StudySession
    let bankTitles: [String: String]

    var body: some View {
        QuizView(session: session, bankTitles: bankTitles)
            .navigationTitle(title)
    }
}

struct ExamScreen: View {
    let content: ModuleContent
    let bankTitles: [String: String]
    @State private var session: StudySession

    init(content: ModuleContent, bankTitles: [String: String]) {
        self.content = content
        self.bankTitles = bankTitles
        _session = State(
            initialValue: StudySession(
                questions: QuestionSampler.draw(
                    from: content.quiz.banks, count: content.exam.questionCount),
                config: .exam(content.exam)
            ))
    }

    var body: some View {
        QuizView(session: session, bankTitles: bankTitles)
            .navigationTitle(content.exam.title ?? "Timed exam")
            .toolbar {
                ToolbarItem(placement: .principal) {
                    ExamTimerView(session: session)
                }
            }
    }
}

/// Flip-card runner over one bank. Grading is kept in view state here; the
/// PersistenceKit StudyStore wiring (durable SRS + streaks) is the P2 exit.
struct FlashcardsScreen: View {
    let bank: Bank
    @State private var index = 0
    @State private var srs: [String: SrsEntry] = [:]

    var body: some View {
        VStack {
            if let question = card {
                Text("\(index + 1) of \(bank.questions.count)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                FlashcardView(
                    front: question.prompt,
                    back: "\(question.correctChoice)\n\n\(question.explanation)"
                ) { correct in
                    srs[question.legacyKey] = Leitner.schedule(
                        srs[question.legacyKey], correct: correct, now: Date())
                    index += 1
                }
            } else {
                ContentUnavailableView(
                    "Deck complete",
                    systemImage: "checkmark.seal",
                    description: Text("\(Leitner.masteredCount(in: srs)) cards on track")
                )
            }
        }
        .navigationTitle(bank.title)
    }

    private var card: Question? {
        bank.questions.indices.contains(index) ? bank.questions[index] : nil
    }
}
