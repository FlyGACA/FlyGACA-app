import { CreateRegulationData, UpdateRegulationData, UpdateRegulationVariables, DeleteRegulationData, DeleteRegulationVariables, GetRegulationData, GetRegulationVariables, ListRegulationsData, CreateChartData, UpdateChartData, UpdateChartVariables, DeleteChartData, DeleteChartVariables, GetChartData, GetChartVariables, ListChartsData, CreateQuizData, CreateQuizVariables, UpdateQuizData, UpdateQuizVariables, DeleteQuizData, DeleteQuizVariables, GetQuizData, GetQuizVariables, ListQuizzesData, CreateQuestionData, CreateQuestionVariables, UpdateQuestionData, UpdateQuestionVariables, DeleteQuestionData, DeleteQuestionVariables, GetQuestionData, GetQuestionVariables, ListQuestionsData, CreateBookmarkData, CreateBookmarkVariables, UpdateBookmarkData, UpdateBookmarkVariables, DeleteBookmarkData, DeleteBookmarkVariables, GetMyBookmarkData, GetMyBookmarkVariables, ListMyBookmarksData, CreateStudyCardData, CreateStudyCardVariables, UpdateStudyCardData, UpdateStudyCardVariables, DeleteStudyCardData, DeleteStudyCardVariables, GetMyStudyCardData, GetMyStudyCardVariables, ListMyStudyCardsData } from '../';
import { UseDataConnectQueryResult, useDataConnectQueryOptions, UseDataConnectMutationResult, useDataConnectMutationOptions} from '@tanstack-query-firebase/react/data-connect';
import { UseQueryResult, UseMutationResult} from '@tanstack/react-query';
import { DataConnect } from 'firebase/data-connect';
import { FirebaseError } from 'firebase/app';


export function useCreateRegulation(options?: useDataConnectMutationOptions<CreateRegulationData, FirebaseError, void>): UseDataConnectMutationResult<CreateRegulationData, undefined>;
export function useCreateRegulation(dc: DataConnect, options?: useDataConnectMutationOptions<CreateRegulationData, FirebaseError, void>): UseDataConnectMutationResult<CreateRegulationData, undefined>;

export function useUpdateRegulation(options?: useDataConnectMutationOptions<UpdateRegulationData, FirebaseError, UpdateRegulationVariables>): UseDataConnectMutationResult<UpdateRegulationData, UpdateRegulationVariables>;
export function useUpdateRegulation(dc: DataConnect, options?: useDataConnectMutationOptions<UpdateRegulationData, FirebaseError, UpdateRegulationVariables>): UseDataConnectMutationResult<UpdateRegulationData, UpdateRegulationVariables>;

export function useDeleteRegulation(options?: useDataConnectMutationOptions<DeleteRegulationData, FirebaseError, DeleteRegulationVariables>): UseDataConnectMutationResult<DeleteRegulationData, DeleteRegulationVariables>;
export function useDeleteRegulation(dc: DataConnect, options?: useDataConnectMutationOptions<DeleteRegulationData, FirebaseError, DeleteRegulationVariables>): UseDataConnectMutationResult<DeleteRegulationData, DeleteRegulationVariables>;

export function useGetRegulation(vars: GetRegulationVariables, options?: useDataConnectQueryOptions<GetRegulationData>): UseDataConnectQueryResult<GetRegulationData, GetRegulationVariables>;
export function useGetRegulation(dc: DataConnect, vars: GetRegulationVariables, options?: useDataConnectQueryOptions<GetRegulationData>): UseDataConnectQueryResult<GetRegulationData, GetRegulationVariables>;

export function useListRegulations(options?: useDataConnectQueryOptions<ListRegulationsData>): UseDataConnectQueryResult<ListRegulationsData, undefined>;
export function useListRegulations(dc: DataConnect, options?: useDataConnectQueryOptions<ListRegulationsData>): UseDataConnectQueryResult<ListRegulationsData, undefined>;

export function useCreateChart(options?: useDataConnectMutationOptions<CreateChartData, FirebaseError, void>): UseDataConnectMutationResult<CreateChartData, undefined>;
export function useCreateChart(dc: DataConnect, options?: useDataConnectMutationOptions<CreateChartData, FirebaseError, void>): UseDataConnectMutationResult<CreateChartData, undefined>;

export function useUpdateChart(options?: useDataConnectMutationOptions<UpdateChartData, FirebaseError, UpdateChartVariables>): UseDataConnectMutationResult<UpdateChartData, UpdateChartVariables>;
export function useUpdateChart(dc: DataConnect, options?: useDataConnectMutationOptions<UpdateChartData, FirebaseError, UpdateChartVariables>): UseDataConnectMutationResult<UpdateChartData, UpdateChartVariables>;

export function useDeleteChart(options?: useDataConnectMutationOptions<DeleteChartData, FirebaseError, DeleteChartVariables>): UseDataConnectMutationResult<DeleteChartData, DeleteChartVariables>;
export function useDeleteChart(dc: DataConnect, options?: useDataConnectMutationOptions<DeleteChartData, FirebaseError, DeleteChartVariables>): UseDataConnectMutationResult<DeleteChartData, DeleteChartVariables>;

export function useGetChart(vars: GetChartVariables, options?: useDataConnectQueryOptions<GetChartData>): UseDataConnectQueryResult<GetChartData, GetChartVariables>;
export function useGetChart(dc: DataConnect, vars: GetChartVariables, options?: useDataConnectQueryOptions<GetChartData>): UseDataConnectQueryResult<GetChartData, GetChartVariables>;

export function useListCharts(options?: useDataConnectQueryOptions<ListChartsData>): UseDataConnectQueryResult<ListChartsData, undefined>;
export function useListCharts(dc: DataConnect, options?: useDataConnectQueryOptions<ListChartsData>): UseDataConnectQueryResult<ListChartsData, undefined>;

export function useCreateQuiz(options?: useDataConnectMutationOptions<CreateQuizData, FirebaseError, CreateQuizVariables>): UseDataConnectMutationResult<CreateQuizData, CreateQuizVariables>;
export function useCreateQuiz(dc: DataConnect, options?: useDataConnectMutationOptions<CreateQuizData, FirebaseError, CreateQuizVariables>): UseDataConnectMutationResult<CreateQuizData, CreateQuizVariables>;

export function useUpdateQuiz(options?: useDataConnectMutationOptions<UpdateQuizData, FirebaseError, UpdateQuizVariables>): UseDataConnectMutationResult<UpdateQuizData, UpdateQuizVariables>;
export function useUpdateQuiz(dc: DataConnect, options?: useDataConnectMutationOptions<UpdateQuizData, FirebaseError, UpdateQuizVariables>): UseDataConnectMutationResult<UpdateQuizData, UpdateQuizVariables>;

export function useDeleteQuiz(options?: useDataConnectMutationOptions<DeleteQuizData, FirebaseError, DeleteQuizVariables>): UseDataConnectMutationResult<DeleteQuizData, DeleteQuizVariables>;
export function useDeleteQuiz(dc: DataConnect, options?: useDataConnectMutationOptions<DeleteQuizData, FirebaseError, DeleteQuizVariables>): UseDataConnectMutationResult<DeleteQuizData, DeleteQuizVariables>;

export function useGetQuiz(vars: GetQuizVariables, options?: useDataConnectQueryOptions<GetQuizData>): UseDataConnectQueryResult<GetQuizData, GetQuizVariables>;
export function useGetQuiz(dc: DataConnect, vars: GetQuizVariables, options?: useDataConnectQueryOptions<GetQuizData>): UseDataConnectQueryResult<GetQuizData, GetQuizVariables>;

export function useListQuizzes(options?: useDataConnectQueryOptions<ListQuizzesData>): UseDataConnectQueryResult<ListQuizzesData, undefined>;
export function useListQuizzes(dc: DataConnect, options?: useDataConnectQueryOptions<ListQuizzesData>): UseDataConnectQueryResult<ListQuizzesData, undefined>;

export function useCreateQuestion(options?: useDataConnectMutationOptions<CreateQuestionData, FirebaseError, CreateQuestionVariables>): UseDataConnectMutationResult<CreateQuestionData, CreateQuestionVariables>;
export function useCreateQuestion(dc: DataConnect, options?: useDataConnectMutationOptions<CreateQuestionData, FirebaseError, CreateQuestionVariables>): UseDataConnectMutationResult<CreateQuestionData, CreateQuestionVariables>;

export function useUpdateQuestion(options?: useDataConnectMutationOptions<UpdateQuestionData, FirebaseError, UpdateQuestionVariables>): UseDataConnectMutationResult<UpdateQuestionData, UpdateQuestionVariables>;
export function useUpdateQuestion(dc: DataConnect, options?: useDataConnectMutationOptions<UpdateQuestionData, FirebaseError, UpdateQuestionVariables>): UseDataConnectMutationResult<UpdateQuestionData, UpdateQuestionVariables>;

export function useDeleteQuestion(options?: useDataConnectMutationOptions<DeleteQuestionData, FirebaseError, DeleteQuestionVariables>): UseDataConnectMutationResult<DeleteQuestionData, DeleteQuestionVariables>;
export function useDeleteQuestion(dc: DataConnect, options?: useDataConnectMutationOptions<DeleteQuestionData, FirebaseError, DeleteQuestionVariables>): UseDataConnectMutationResult<DeleteQuestionData, DeleteQuestionVariables>;

export function useGetQuestion(vars: GetQuestionVariables, options?: useDataConnectQueryOptions<GetQuestionData>): UseDataConnectQueryResult<GetQuestionData, GetQuestionVariables>;
export function useGetQuestion(dc: DataConnect, vars: GetQuestionVariables, options?: useDataConnectQueryOptions<GetQuestionData>): UseDataConnectQueryResult<GetQuestionData, GetQuestionVariables>;

export function useListQuestions(options?: useDataConnectQueryOptions<ListQuestionsData>): UseDataConnectQueryResult<ListQuestionsData, undefined>;
export function useListQuestions(dc: DataConnect, options?: useDataConnectQueryOptions<ListQuestionsData>): UseDataConnectQueryResult<ListQuestionsData, undefined>;

export function useCreateBookmark(options?: useDataConnectMutationOptions<CreateBookmarkData, FirebaseError, CreateBookmarkVariables>): UseDataConnectMutationResult<CreateBookmarkData, CreateBookmarkVariables>;
export function useCreateBookmark(dc: DataConnect, options?: useDataConnectMutationOptions<CreateBookmarkData, FirebaseError, CreateBookmarkVariables>): UseDataConnectMutationResult<CreateBookmarkData, CreateBookmarkVariables>;

export function useUpdateBookmark(options?: useDataConnectMutationOptions<UpdateBookmarkData, FirebaseError, UpdateBookmarkVariables>): UseDataConnectMutationResult<UpdateBookmarkData, UpdateBookmarkVariables>;
export function useUpdateBookmark(dc: DataConnect, options?: useDataConnectMutationOptions<UpdateBookmarkData, FirebaseError, UpdateBookmarkVariables>): UseDataConnectMutationResult<UpdateBookmarkData, UpdateBookmarkVariables>;

export function useDeleteBookmark(options?: useDataConnectMutationOptions<DeleteBookmarkData, FirebaseError, DeleteBookmarkVariables>): UseDataConnectMutationResult<DeleteBookmarkData, DeleteBookmarkVariables>;
export function useDeleteBookmark(dc: DataConnect, options?: useDataConnectMutationOptions<DeleteBookmarkData, FirebaseError, DeleteBookmarkVariables>): UseDataConnectMutationResult<DeleteBookmarkData, DeleteBookmarkVariables>;

export function useGetMyBookmark(vars: GetMyBookmarkVariables, options?: useDataConnectQueryOptions<GetMyBookmarkData>): UseDataConnectQueryResult<GetMyBookmarkData, GetMyBookmarkVariables>;
export function useGetMyBookmark(dc: DataConnect, vars: GetMyBookmarkVariables, options?: useDataConnectQueryOptions<GetMyBookmarkData>): UseDataConnectQueryResult<GetMyBookmarkData, GetMyBookmarkVariables>;

export function useListMyBookmarks(options?: useDataConnectQueryOptions<ListMyBookmarksData>): UseDataConnectQueryResult<ListMyBookmarksData, undefined>;
export function useListMyBookmarks(dc: DataConnect, options?: useDataConnectQueryOptions<ListMyBookmarksData>): UseDataConnectQueryResult<ListMyBookmarksData, undefined>;

export function useCreateStudyCard(options?: useDataConnectMutationOptions<CreateStudyCardData, FirebaseError, CreateStudyCardVariables>): UseDataConnectMutationResult<CreateStudyCardData, CreateStudyCardVariables>;
export function useCreateStudyCard(dc: DataConnect, options?: useDataConnectMutationOptions<CreateStudyCardData, FirebaseError, CreateStudyCardVariables>): UseDataConnectMutationResult<CreateStudyCardData, CreateStudyCardVariables>;

export function useUpdateStudyCard(options?: useDataConnectMutationOptions<UpdateStudyCardData, FirebaseError, UpdateStudyCardVariables>): UseDataConnectMutationResult<UpdateStudyCardData, UpdateStudyCardVariables>;
export function useUpdateStudyCard(dc: DataConnect, options?: useDataConnectMutationOptions<UpdateStudyCardData, FirebaseError, UpdateStudyCardVariables>): UseDataConnectMutationResult<UpdateStudyCardData, UpdateStudyCardVariables>;

export function useDeleteStudyCard(options?: useDataConnectMutationOptions<DeleteStudyCardData, FirebaseError, DeleteStudyCardVariables>): UseDataConnectMutationResult<DeleteStudyCardData, DeleteStudyCardVariables>;
export function useDeleteStudyCard(dc: DataConnect, options?: useDataConnectMutationOptions<DeleteStudyCardData, FirebaseError, DeleteStudyCardVariables>): UseDataConnectMutationResult<DeleteStudyCardData, DeleteStudyCardVariables>;

export function useGetMyStudyCard(vars: GetMyStudyCardVariables, options?: useDataConnectQueryOptions<GetMyStudyCardData>): UseDataConnectQueryResult<GetMyStudyCardData, GetMyStudyCardVariables>;
export function useGetMyStudyCard(dc: DataConnect, vars: GetMyStudyCardVariables, options?: useDataConnectQueryOptions<GetMyStudyCardData>): UseDataConnectQueryResult<GetMyStudyCardData, GetMyStudyCardVariables>;

export function useListMyStudyCards(options?: useDataConnectQueryOptions<ListMyStudyCardsData>): UseDataConnectQueryResult<ListMyStudyCardsData, undefined>;
export function useListMyStudyCards(dc: DataConnect, options?: useDataConnectQueryOptions<ListMyStudyCardsData>): UseDataConnectQueryResult<ListMyStudyCardsData, undefined>;
