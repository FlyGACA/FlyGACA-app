import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, ExecuteQueryOptions, MutationRef, MutationPromise, DataConnectSettings } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;
export const dataConnectSettings: DataConnectSettings;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface Chart_Key {
  id: UUIDString;
  __typename?: 'Chart_Key';
}

export interface CreateBookmarkData {
  userBookmark_insert: UserBookmark_Key;
}

export interface CreateBookmarkVariables {
  contentId: UUIDString;
  contentType: string;
  regId?: UUIDString | null;
  chartId?: UUIDString | null;
}

export interface CreateChartData {
  chart_insert: Chart_Key;
}

export interface CreateQuestionData {
  question_insert: Question_Key;
}

export interface CreateQuestionVariables {
  prompt: string;
  answer: string;
  options: string[];
  citation: string;
  quizId: UUIDString;
}

export interface CreateQuizData {
  quiz_insert: Quiz_Key;
}

export interface CreateQuizVariables {
  title: string;
  regId: UUIDString;
}

export interface CreateRegulationData {
  regulation_insert: Regulation_Key;
}

export interface CreateStudyCardData {
  studyCard_insert: StudyCard_Key;
}

export interface CreateStudyCardVariables {
  front: string;
  back: string;
  citation: string;
}

export interface DeleteBookmarkData {
  userBookmark_delete?: UserBookmark_Key | null;
}

export interface DeleteBookmarkVariables {
  id: UUIDString;
}

export interface DeleteChartData {
  chart_delete?: Chart_Key | null;
}

export interface DeleteChartVariables {
  id: UUIDString;
}

export interface DeleteQuestionData {
  question_delete?: Question_Key | null;
}

export interface DeleteQuestionVariables {
  id: UUIDString;
}

export interface DeleteQuizData {
  quiz_delete?: Quiz_Key | null;
}

export interface DeleteQuizVariables {
  id: UUIDString;
}

export interface DeleteRegulationData {
  regulation_delete?: Regulation_Key | null;
}

export interface DeleteRegulationVariables {
  id: UUIDString;
}

export interface DeleteStudyCardData {
  studyCard_delete?: StudyCard_Key | null;
}

export interface DeleteStudyCardVariables {
  id: UUIDString;
}

export interface GetChartData {
  chart?: {
    name: string;
    type: string;
    fileUrl: string;
  };
}

export interface GetChartVariables {
  id: UUIDString;
}

export interface GetMyBookmarkData {
  userBookmark?: {
    userId: UUIDString;
    contentId: UUIDString;
    contentType: string;
    note?: string | null;
  };
}

export interface GetMyBookmarkVariables {
  id: UUIDString;
}

export interface GetMyStudyCardData {
  studyCard?: {
    front: string;
    back: string;
    citationReference: string;
  };
}

export interface GetMyStudyCardVariables {
  id: UUIDString;
}

export interface GetQuestionData {
  question?: {
    prompt: string;
    options: string[];
  };
}

export interface GetQuestionVariables {
  id: UUIDString;
}

export interface GetQuizData {
  quiz?: {
    title: string;
  };
}

export interface GetQuizVariables {
  id: UUIDString;
}

export interface GetRegulationData {
  regulation?: {
    partNumber: string;
    title: string;
    content: string;
  };
}

export interface GetRegulationVariables {
  id: UUIDString;
}

export interface ListChartsData {
  charts: ({
    name: string;
    type: string;
  })[];
}

export interface ListMyBookmarksData {
  userBookmarks: ({
    contentId: UUIDString;
    contentType: string;
    note?: string | null;
  })[];
}

export interface ListMyStudyCardsData {
  studyCards: ({
    front: string;
    back: string;
  })[];
}

export interface ListQuestionsData {
  questions: ({
    prompt: string;
  })[];
}

export interface ListQuizzesData {
  quizzes: ({
    title: string;
  })[];
}

export interface ListRegulationsData {
  regulations: ({
    partNumber: string;
    title: string;
  })[];
}

export interface Question_Key {
  id: UUIDString;
  __typename?: 'Question_Key';
}

export interface Quiz_Key {
  id: UUIDString;
  __typename?: 'Quiz_Key';
}

export interface Regulation_Key {
  id: UUIDString;
  __typename?: 'Regulation_Key';
}

export interface StudyCard_Key {
  id: UUIDString;
  __typename?: 'StudyCard_Key';
}

export interface UpdateBookmarkData {
  userBookmark_update?: UserBookmark_Key | null;
}

export interface UpdateBookmarkVariables {
  id: UUIDString;
  note?: string | null;
}

export interface UpdateChartData {
  chart_update?: Chart_Key | null;
}

export interface UpdateChartVariables {
  id: UUIDString;
  fileUrl?: string | null;
}

export interface UpdateQuestionData {
  question_update?: Question_Key | null;
}

export interface UpdateQuestionVariables {
  id: UUIDString;
  prompt?: string | null;
}

export interface UpdateQuizData {
  quiz_update?: Quiz_Key | null;
}

export interface UpdateQuizVariables {
  id: UUIDString;
  title?: string | null;
}

export interface UpdateRegulationData {
  regulation_update?: Regulation_Key | null;
}

export interface UpdateRegulationVariables {
  id: UUIDString;
  title?: string | null;
}

export interface UpdateStudyCardData {
  studyCard_update?: StudyCard_Key | null;
}

export interface UpdateStudyCardVariables {
  id: UUIDString;
  front?: string | null;
}

export interface UserBookmark_Key {
  id: UUIDString;
  __typename?: 'UserBookmark_Key';
}

interface CreateRegulationRef {
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<CreateRegulationData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): MutationRef<CreateRegulationData, undefined>;
  operationName: string;
}
export const createRegulationRef: CreateRegulationRef;

export function createRegulation(): MutationPromise<CreateRegulationData, undefined>;
export function createRegulation(dc: DataConnect): MutationPromise<CreateRegulationData, undefined>;

interface UpdateRegulationRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateRegulationVariables): MutationRef<UpdateRegulationData, UpdateRegulationVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateRegulationVariables): MutationRef<UpdateRegulationData, UpdateRegulationVariables>;
  operationName: string;
}
export const updateRegulationRef: UpdateRegulationRef;

export function updateRegulation(vars: UpdateRegulationVariables): MutationPromise<UpdateRegulationData, UpdateRegulationVariables>;
export function updateRegulation(dc: DataConnect, vars: UpdateRegulationVariables): MutationPromise<UpdateRegulationData, UpdateRegulationVariables>;

interface DeleteRegulationRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeleteRegulationVariables): MutationRef<DeleteRegulationData, DeleteRegulationVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: DeleteRegulationVariables): MutationRef<DeleteRegulationData, DeleteRegulationVariables>;
  operationName: string;
}
export const deleteRegulationRef: DeleteRegulationRef;

export function deleteRegulation(vars: DeleteRegulationVariables): MutationPromise<DeleteRegulationData, DeleteRegulationVariables>;
export function deleteRegulation(dc: DataConnect, vars: DeleteRegulationVariables): MutationPromise<DeleteRegulationData, DeleteRegulationVariables>;

interface GetRegulationRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetRegulationVariables): QueryRef<GetRegulationData, GetRegulationVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetRegulationVariables): QueryRef<GetRegulationData, GetRegulationVariables>;
  operationName: string;
}
export const getRegulationRef: GetRegulationRef;

export function getRegulation(vars: GetRegulationVariables, options?: ExecuteQueryOptions): QueryPromise<GetRegulationData, GetRegulationVariables>;
export function getRegulation(dc: DataConnect, vars: GetRegulationVariables, options?: ExecuteQueryOptions): QueryPromise<GetRegulationData, GetRegulationVariables>;

interface ListRegulationsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListRegulationsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListRegulationsData, undefined>;
  operationName: string;
}
export const listRegulationsRef: ListRegulationsRef;

export function listRegulations(options?: ExecuteQueryOptions): QueryPromise<ListRegulationsData, undefined>;
export function listRegulations(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListRegulationsData, undefined>;

interface CreateChartRef {
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<CreateChartData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): MutationRef<CreateChartData, undefined>;
  operationName: string;
}
export const createChartRef: CreateChartRef;

export function createChart(): MutationPromise<CreateChartData, undefined>;
export function createChart(dc: DataConnect): MutationPromise<CreateChartData, undefined>;

interface UpdateChartRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateChartVariables): MutationRef<UpdateChartData, UpdateChartVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateChartVariables): MutationRef<UpdateChartData, UpdateChartVariables>;
  operationName: string;
}
export const updateChartRef: UpdateChartRef;

export function updateChart(vars: UpdateChartVariables): MutationPromise<UpdateChartData, UpdateChartVariables>;
export function updateChart(dc: DataConnect, vars: UpdateChartVariables): MutationPromise<UpdateChartData, UpdateChartVariables>;

interface DeleteChartRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeleteChartVariables): MutationRef<DeleteChartData, DeleteChartVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: DeleteChartVariables): MutationRef<DeleteChartData, DeleteChartVariables>;
  operationName: string;
}
export const deleteChartRef: DeleteChartRef;

export function deleteChart(vars: DeleteChartVariables): MutationPromise<DeleteChartData, DeleteChartVariables>;
export function deleteChart(dc: DataConnect, vars: DeleteChartVariables): MutationPromise<DeleteChartData, DeleteChartVariables>;

interface GetChartRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetChartVariables): QueryRef<GetChartData, GetChartVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetChartVariables): QueryRef<GetChartData, GetChartVariables>;
  operationName: string;
}
export const getChartRef: GetChartRef;

export function getChart(vars: GetChartVariables, options?: ExecuteQueryOptions): QueryPromise<GetChartData, GetChartVariables>;
export function getChart(dc: DataConnect, vars: GetChartVariables, options?: ExecuteQueryOptions): QueryPromise<GetChartData, GetChartVariables>;

interface ListChartsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListChartsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListChartsData, undefined>;
  operationName: string;
}
export const listChartsRef: ListChartsRef;

export function listCharts(options?: ExecuteQueryOptions): QueryPromise<ListChartsData, undefined>;
export function listCharts(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListChartsData, undefined>;

interface CreateQuizRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateQuizVariables): MutationRef<CreateQuizData, CreateQuizVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateQuizVariables): MutationRef<CreateQuizData, CreateQuizVariables>;
  operationName: string;
}
export const createQuizRef: CreateQuizRef;

export function createQuiz(vars: CreateQuizVariables): MutationPromise<CreateQuizData, CreateQuizVariables>;
export function createQuiz(dc: DataConnect, vars: CreateQuizVariables): MutationPromise<CreateQuizData, CreateQuizVariables>;

interface UpdateQuizRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateQuizVariables): MutationRef<UpdateQuizData, UpdateQuizVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateQuizVariables): MutationRef<UpdateQuizData, UpdateQuizVariables>;
  operationName: string;
}
export const updateQuizRef: UpdateQuizRef;

export function updateQuiz(vars: UpdateQuizVariables): MutationPromise<UpdateQuizData, UpdateQuizVariables>;
export function updateQuiz(dc: DataConnect, vars: UpdateQuizVariables): MutationPromise<UpdateQuizData, UpdateQuizVariables>;

interface DeleteQuizRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeleteQuizVariables): MutationRef<DeleteQuizData, DeleteQuizVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: DeleteQuizVariables): MutationRef<DeleteQuizData, DeleteQuizVariables>;
  operationName: string;
}
export const deleteQuizRef: DeleteQuizRef;

export function deleteQuiz(vars: DeleteQuizVariables): MutationPromise<DeleteQuizData, DeleteQuizVariables>;
export function deleteQuiz(dc: DataConnect, vars: DeleteQuizVariables): MutationPromise<DeleteQuizData, DeleteQuizVariables>;

interface GetQuizRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetQuizVariables): QueryRef<GetQuizData, GetQuizVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetQuizVariables): QueryRef<GetQuizData, GetQuizVariables>;
  operationName: string;
}
export const getQuizRef: GetQuizRef;

export function getQuiz(vars: GetQuizVariables, options?: ExecuteQueryOptions): QueryPromise<GetQuizData, GetQuizVariables>;
export function getQuiz(dc: DataConnect, vars: GetQuizVariables, options?: ExecuteQueryOptions): QueryPromise<GetQuizData, GetQuizVariables>;

interface ListQuizzesRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListQuizzesData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListQuizzesData, undefined>;
  operationName: string;
}
export const listQuizzesRef: ListQuizzesRef;

export function listQuizzes(options?: ExecuteQueryOptions): QueryPromise<ListQuizzesData, undefined>;
export function listQuizzes(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListQuizzesData, undefined>;

interface CreateQuestionRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateQuestionVariables): MutationRef<CreateQuestionData, CreateQuestionVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateQuestionVariables): MutationRef<CreateQuestionData, CreateQuestionVariables>;
  operationName: string;
}
export const createQuestionRef: CreateQuestionRef;

export function createQuestion(vars: CreateQuestionVariables): MutationPromise<CreateQuestionData, CreateQuestionVariables>;
export function createQuestion(dc: DataConnect, vars: CreateQuestionVariables): MutationPromise<CreateQuestionData, CreateQuestionVariables>;

interface UpdateQuestionRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateQuestionVariables): MutationRef<UpdateQuestionData, UpdateQuestionVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateQuestionVariables): MutationRef<UpdateQuestionData, UpdateQuestionVariables>;
  operationName: string;
}
export const updateQuestionRef: UpdateQuestionRef;

export function updateQuestion(vars: UpdateQuestionVariables): MutationPromise<UpdateQuestionData, UpdateQuestionVariables>;
export function updateQuestion(dc: DataConnect, vars: UpdateQuestionVariables): MutationPromise<UpdateQuestionData, UpdateQuestionVariables>;

interface DeleteQuestionRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeleteQuestionVariables): MutationRef<DeleteQuestionData, DeleteQuestionVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: DeleteQuestionVariables): MutationRef<DeleteQuestionData, DeleteQuestionVariables>;
  operationName: string;
}
export const deleteQuestionRef: DeleteQuestionRef;

export function deleteQuestion(vars: DeleteQuestionVariables): MutationPromise<DeleteQuestionData, DeleteQuestionVariables>;
export function deleteQuestion(dc: DataConnect, vars: DeleteQuestionVariables): MutationPromise<DeleteQuestionData, DeleteQuestionVariables>;

interface GetQuestionRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetQuestionVariables): QueryRef<GetQuestionData, GetQuestionVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetQuestionVariables): QueryRef<GetQuestionData, GetQuestionVariables>;
  operationName: string;
}
export const getQuestionRef: GetQuestionRef;

export function getQuestion(vars: GetQuestionVariables, options?: ExecuteQueryOptions): QueryPromise<GetQuestionData, GetQuestionVariables>;
export function getQuestion(dc: DataConnect, vars: GetQuestionVariables, options?: ExecuteQueryOptions): QueryPromise<GetQuestionData, GetQuestionVariables>;

interface ListQuestionsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListQuestionsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListQuestionsData, undefined>;
  operationName: string;
}
export const listQuestionsRef: ListQuestionsRef;

export function listQuestions(options?: ExecuteQueryOptions): QueryPromise<ListQuestionsData, undefined>;
export function listQuestions(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListQuestionsData, undefined>;

interface CreateBookmarkRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateBookmarkVariables): MutationRef<CreateBookmarkData, CreateBookmarkVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateBookmarkVariables): MutationRef<CreateBookmarkData, CreateBookmarkVariables>;
  operationName: string;
}
export const createBookmarkRef: CreateBookmarkRef;

export function createBookmark(vars: CreateBookmarkVariables): MutationPromise<CreateBookmarkData, CreateBookmarkVariables>;
export function createBookmark(dc: DataConnect, vars: CreateBookmarkVariables): MutationPromise<CreateBookmarkData, CreateBookmarkVariables>;

interface UpdateBookmarkRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateBookmarkVariables): MutationRef<UpdateBookmarkData, UpdateBookmarkVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateBookmarkVariables): MutationRef<UpdateBookmarkData, UpdateBookmarkVariables>;
  operationName: string;
}
export const updateBookmarkRef: UpdateBookmarkRef;

export function updateBookmark(vars: UpdateBookmarkVariables): MutationPromise<UpdateBookmarkData, UpdateBookmarkVariables>;
export function updateBookmark(dc: DataConnect, vars: UpdateBookmarkVariables): MutationPromise<UpdateBookmarkData, UpdateBookmarkVariables>;

interface DeleteBookmarkRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeleteBookmarkVariables): MutationRef<DeleteBookmarkData, DeleteBookmarkVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: DeleteBookmarkVariables): MutationRef<DeleteBookmarkData, DeleteBookmarkVariables>;
  operationName: string;
}
export const deleteBookmarkRef: DeleteBookmarkRef;

export function deleteBookmark(vars: DeleteBookmarkVariables): MutationPromise<DeleteBookmarkData, DeleteBookmarkVariables>;
export function deleteBookmark(dc: DataConnect, vars: DeleteBookmarkVariables): MutationPromise<DeleteBookmarkData, DeleteBookmarkVariables>;

interface GetMyBookmarkRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetMyBookmarkVariables): QueryRef<GetMyBookmarkData, GetMyBookmarkVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetMyBookmarkVariables): QueryRef<GetMyBookmarkData, GetMyBookmarkVariables>;
  operationName: string;
}
export const getMyBookmarkRef: GetMyBookmarkRef;

export function getMyBookmark(vars: GetMyBookmarkVariables, options?: ExecuteQueryOptions): QueryPromise<GetMyBookmarkData, GetMyBookmarkVariables>;
export function getMyBookmark(dc: DataConnect, vars: GetMyBookmarkVariables, options?: ExecuteQueryOptions): QueryPromise<GetMyBookmarkData, GetMyBookmarkVariables>;

interface ListMyBookmarksRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListMyBookmarksData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListMyBookmarksData, undefined>;
  operationName: string;
}
export const listMyBookmarksRef: ListMyBookmarksRef;

export function listMyBookmarks(options?: ExecuteQueryOptions): QueryPromise<ListMyBookmarksData, undefined>;
export function listMyBookmarks(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListMyBookmarksData, undefined>;

interface CreateStudyCardRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateStudyCardVariables): MutationRef<CreateStudyCardData, CreateStudyCardVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateStudyCardVariables): MutationRef<CreateStudyCardData, CreateStudyCardVariables>;
  operationName: string;
}
export const createStudyCardRef: CreateStudyCardRef;

export function createStudyCard(vars: CreateStudyCardVariables): MutationPromise<CreateStudyCardData, CreateStudyCardVariables>;
export function createStudyCard(dc: DataConnect, vars: CreateStudyCardVariables): MutationPromise<CreateStudyCardData, CreateStudyCardVariables>;

interface UpdateStudyCardRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateStudyCardVariables): MutationRef<UpdateStudyCardData, UpdateStudyCardVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateStudyCardVariables): MutationRef<UpdateStudyCardData, UpdateStudyCardVariables>;
  operationName: string;
}
export const updateStudyCardRef: UpdateStudyCardRef;

export function updateStudyCard(vars: UpdateStudyCardVariables): MutationPromise<UpdateStudyCardData, UpdateStudyCardVariables>;
export function updateStudyCard(dc: DataConnect, vars: UpdateStudyCardVariables): MutationPromise<UpdateStudyCardData, UpdateStudyCardVariables>;

interface DeleteStudyCardRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeleteStudyCardVariables): MutationRef<DeleteStudyCardData, DeleteStudyCardVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: DeleteStudyCardVariables): MutationRef<DeleteStudyCardData, DeleteStudyCardVariables>;
  operationName: string;
}
export const deleteStudyCardRef: DeleteStudyCardRef;

export function deleteStudyCard(vars: DeleteStudyCardVariables): MutationPromise<DeleteStudyCardData, DeleteStudyCardVariables>;
export function deleteStudyCard(dc: DataConnect, vars: DeleteStudyCardVariables): MutationPromise<DeleteStudyCardData, DeleteStudyCardVariables>;

interface GetMyStudyCardRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetMyStudyCardVariables): QueryRef<GetMyStudyCardData, GetMyStudyCardVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetMyStudyCardVariables): QueryRef<GetMyStudyCardData, GetMyStudyCardVariables>;
  operationName: string;
}
export const getMyStudyCardRef: GetMyStudyCardRef;

export function getMyStudyCard(vars: GetMyStudyCardVariables, options?: ExecuteQueryOptions): QueryPromise<GetMyStudyCardData, GetMyStudyCardVariables>;
export function getMyStudyCard(dc: DataConnect, vars: GetMyStudyCardVariables, options?: ExecuteQueryOptions): QueryPromise<GetMyStudyCardData, GetMyStudyCardVariables>;

interface ListMyStudyCardsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListMyStudyCardsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListMyStudyCardsData, undefined>;
  operationName: string;
}
export const listMyStudyCardsRef: ListMyStudyCardsRef;

export function listMyStudyCards(options?: ExecuteQueryOptions): QueryPromise<ListMyStudyCardsData, undefined>;
export function listMyStudyCards(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListMyStudyCardsData, undefined>;

