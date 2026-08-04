# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `example`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

**If you're looking for the `React README`, you can find it at [`dataconnect-generated/react/README.md`](./react/README.md)**

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*GetRegulation*](#getregulation)
  - [*ListRegulations*](#listregulations)
  - [*GetChart*](#getchart)
  - [*ListCharts*](#listcharts)
  - [*GetQuiz*](#getquiz)
  - [*ListQuizzes*](#listquizzes)
  - [*GetQuestion*](#getquestion)
  - [*ListQuestions*](#listquestions)
  - [*GetMyBookmark*](#getmybookmark)
  - [*ListMyBookmarks*](#listmybookmarks)
  - [*GetMyStudyCard*](#getmystudycard)
  - [*ListMyStudyCards*](#listmystudycards)
- [**Mutations**](#mutations)
  - [*CreateRegulation*](#createregulation)
  - [*UpdateRegulation*](#updateregulation)
  - [*DeleteRegulation*](#deleteregulation)
  - [*CreateChart*](#createchart)
  - [*UpdateChart*](#updatechart)
  - [*DeleteChart*](#deletechart)
  - [*CreateQuiz*](#createquiz)
  - [*UpdateQuiz*](#updatequiz)
  - [*DeleteQuiz*](#deletequiz)
  - [*CreateQuestion*](#createquestion)
  - [*UpdateQuestion*](#updatequestion)
  - [*DeleteQuestion*](#deletequestion)
  - [*CreateBookmark*](#createbookmark)
  - [*UpdateBookmark*](#updatebookmark)
  - [*DeleteBookmark*](#deletebookmark)
  - [*CreateStudyCard*](#createstudycard)
  - [*UpdateStudyCard*](#updatestudycard)
  - [*DeleteStudyCard*](#deletestudycard)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `example`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@dataconnect/generated` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## GetRegulation
You can execute the `GetRegulation` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getRegulation(vars: GetRegulationVariables, options?: ExecuteQueryOptions): QueryPromise<GetRegulationData, GetRegulationVariables>;

interface GetRegulationRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetRegulationVariables): QueryRef<GetRegulationData, GetRegulationVariables>;
}
export const getRegulationRef: GetRegulationRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getRegulation(dc: DataConnect, vars: GetRegulationVariables, options?: ExecuteQueryOptions): QueryPromise<GetRegulationData, GetRegulationVariables>;

interface GetRegulationRef {
  ...
  (dc: DataConnect, vars: GetRegulationVariables): QueryRef<GetRegulationData, GetRegulationVariables>;
}
export const getRegulationRef: GetRegulationRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getRegulationRef:
```typescript
const name = getRegulationRef.operationName;
console.log(name);
```

### Variables
The `GetRegulation` query requires an argument of type `GetRegulationVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetRegulationVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `GetRegulation` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetRegulationData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetRegulationData {
  regulation?: {
    partNumber: string;
    title: string;
    content: string;
  };
}
```
### Using `GetRegulation`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getRegulation, GetRegulationVariables } from '@dataconnect/generated';

// The `GetRegulation` query requires an argument of type `GetRegulationVariables`:
const getRegulationVars: GetRegulationVariables = {
  id: ..., 
};

// Call the `getRegulation()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getRegulation(getRegulationVars);
// Variables can be defined inline as well.
const { data } = await getRegulation({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getRegulation(dataConnect, getRegulationVars);

console.log(data.regulation);

// Or, you can use the `Promise` API.
getRegulation(getRegulationVars).then((response) => {
  const data = response.data;
  console.log(data.regulation);
});
```

### Using `GetRegulation`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getRegulationRef, GetRegulationVariables } from '@dataconnect/generated';

// The `GetRegulation` query requires an argument of type `GetRegulationVariables`:
const getRegulationVars: GetRegulationVariables = {
  id: ..., 
};

// Call the `getRegulationRef()` function to get a reference to the query.
const ref = getRegulationRef(getRegulationVars);
// Variables can be defined inline as well.
const ref = getRegulationRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getRegulationRef(dataConnect, getRegulationVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.regulation);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.regulation);
});
```

## ListRegulations
You can execute the `ListRegulations` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listRegulations(options?: ExecuteQueryOptions): QueryPromise<ListRegulationsData, undefined>;

interface ListRegulationsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListRegulationsData, undefined>;
}
export const listRegulationsRef: ListRegulationsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listRegulations(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListRegulationsData, undefined>;

interface ListRegulationsRef {
  ...
  (dc: DataConnect): QueryRef<ListRegulationsData, undefined>;
}
export const listRegulationsRef: ListRegulationsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listRegulationsRef:
```typescript
const name = listRegulationsRef.operationName;
console.log(name);
```

### Variables
The `ListRegulations` query has no variables.
### Return Type
Recall that executing the `ListRegulations` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListRegulationsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListRegulationsData {
  regulations: ({
    partNumber: string;
    title: string;
  })[];
}
```
### Using `ListRegulations`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listRegulations } from '@dataconnect/generated';


// Call the `listRegulations()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listRegulations();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listRegulations(dataConnect);

console.log(data.regulations);

// Or, you can use the `Promise` API.
listRegulations().then((response) => {
  const data = response.data;
  console.log(data.regulations);
});
```

### Using `ListRegulations`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listRegulationsRef } from '@dataconnect/generated';


// Call the `listRegulationsRef()` function to get a reference to the query.
const ref = listRegulationsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listRegulationsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.regulations);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.regulations);
});
```

## GetChart
You can execute the `GetChart` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getChart(vars: GetChartVariables, options?: ExecuteQueryOptions): QueryPromise<GetChartData, GetChartVariables>;

interface GetChartRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetChartVariables): QueryRef<GetChartData, GetChartVariables>;
}
export const getChartRef: GetChartRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getChart(dc: DataConnect, vars: GetChartVariables, options?: ExecuteQueryOptions): QueryPromise<GetChartData, GetChartVariables>;

interface GetChartRef {
  ...
  (dc: DataConnect, vars: GetChartVariables): QueryRef<GetChartData, GetChartVariables>;
}
export const getChartRef: GetChartRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getChartRef:
```typescript
const name = getChartRef.operationName;
console.log(name);
```

### Variables
The `GetChart` query requires an argument of type `GetChartVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetChartVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `GetChart` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetChartData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetChartData {
  chart?: {
    name: string;
    type: string;
    fileUrl: string;
  };
}
```
### Using `GetChart`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getChart, GetChartVariables } from '@dataconnect/generated';

// The `GetChart` query requires an argument of type `GetChartVariables`:
const getChartVars: GetChartVariables = {
  id: ..., 
};

// Call the `getChart()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getChart(getChartVars);
// Variables can be defined inline as well.
const { data } = await getChart({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getChart(dataConnect, getChartVars);

console.log(data.chart);

// Or, you can use the `Promise` API.
getChart(getChartVars).then((response) => {
  const data = response.data;
  console.log(data.chart);
});
```

### Using `GetChart`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getChartRef, GetChartVariables } from '@dataconnect/generated';

// The `GetChart` query requires an argument of type `GetChartVariables`:
const getChartVars: GetChartVariables = {
  id: ..., 
};

// Call the `getChartRef()` function to get a reference to the query.
const ref = getChartRef(getChartVars);
// Variables can be defined inline as well.
const ref = getChartRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getChartRef(dataConnect, getChartVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.chart);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.chart);
});
```

## ListCharts
You can execute the `ListCharts` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listCharts(options?: ExecuteQueryOptions): QueryPromise<ListChartsData, undefined>;

interface ListChartsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListChartsData, undefined>;
}
export const listChartsRef: ListChartsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listCharts(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListChartsData, undefined>;

interface ListChartsRef {
  ...
  (dc: DataConnect): QueryRef<ListChartsData, undefined>;
}
export const listChartsRef: ListChartsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listChartsRef:
```typescript
const name = listChartsRef.operationName;
console.log(name);
```

### Variables
The `ListCharts` query has no variables.
### Return Type
Recall that executing the `ListCharts` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListChartsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListChartsData {
  charts: ({
    name: string;
    type: string;
  })[];
}
```
### Using `ListCharts`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listCharts } from '@dataconnect/generated';


// Call the `listCharts()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listCharts();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listCharts(dataConnect);

console.log(data.charts);

// Or, you can use the `Promise` API.
listCharts().then((response) => {
  const data = response.data;
  console.log(data.charts);
});
```

### Using `ListCharts`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listChartsRef } from '@dataconnect/generated';


// Call the `listChartsRef()` function to get a reference to the query.
const ref = listChartsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listChartsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.charts);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.charts);
});
```

## GetQuiz
You can execute the `GetQuiz` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getQuiz(vars: GetQuizVariables, options?: ExecuteQueryOptions): QueryPromise<GetQuizData, GetQuizVariables>;

interface GetQuizRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetQuizVariables): QueryRef<GetQuizData, GetQuizVariables>;
}
export const getQuizRef: GetQuizRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getQuiz(dc: DataConnect, vars: GetQuizVariables, options?: ExecuteQueryOptions): QueryPromise<GetQuizData, GetQuizVariables>;

interface GetQuizRef {
  ...
  (dc: DataConnect, vars: GetQuizVariables): QueryRef<GetQuizData, GetQuizVariables>;
}
export const getQuizRef: GetQuizRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getQuizRef:
```typescript
const name = getQuizRef.operationName;
console.log(name);
```

### Variables
The `GetQuiz` query requires an argument of type `GetQuizVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetQuizVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `GetQuiz` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetQuizData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetQuizData {
  quiz?: {
    title: string;
  };
}
```
### Using `GetQuiz`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getQuiz, GetQuizVariables } from '@dataconnect/generated';

// The `GetQuiz` query requires an argument of type `GetQuizVariables`:
const getQuizVars: GetQuizVariables = {
  id: ..., 
};

// Call the `getQuiz()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getQuiz(getQuizVars);
// Variables can be defined inline as well.
const { data } = await getQuiz({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getQuiz(dataConnect, getQuizVars);

console.log(data.quiz);

// Or, you can use the `Promise` API.
getQuiz(getQuizVars).then((response) => {
  const data = response.data;
  console.log(data.quiz);
});
```

### Using `GetQuiz`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getQuizRef, GetQuizVariables } from '@dataconnect/generated';

// The `GetQuiz` query requires an argument of type `GetQuizVariables`:
const getQuizVars: GetQuizVariables = {
  id: ..., 
};

// Call the `getQuizRef()` function to get a reference to the query.
const ref = getQuizRef(getQuizVars);
// Variables can be defined inline as well.
const ref = getQuizRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getQuizRef(dataConnect, getQuizVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.quiz);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.quiz);
});
```

## ListQuizzes
You can execute the `ListQuizzes` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listQuizzes(options?: ExecuteQueryOptions): QueryPromise<ListQuizzesData, undefined>;

interface ListQuizzesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListQuizzesData, undefined>;
}
export const listQuizzesRef: ListQuizzesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listQuizzes(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListQuizzesData, undefined>;

interface ListQuizzesRef {
  ...
  (dc: DataConnect): QueryRef<ListQuizzesData, undefined>;
}
export const listQuizzesRef: ListQuizzesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listQuizzesRef:
```typescript
const name = listQuizzesRef.operationName;
console.log(name);
```

### Variables
The `ListQuizzes` query has no variables.
### Return Type
Recall that executing the `ListQuizzes` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListQuizzesData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListQuizzesData {
  quizzes: ({
    title: string;
  })[];
}
```
### Using `ListQuizzes`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listQuizzes } from '@dataconnect/generated';


// Call the `listQuizzes()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listQuizzes();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listQuizzes(dataConnect);

console.log(data.quizzes);

// Or, you can use the `Promise` API.
listQuizzes().then((response) => {
  const data = response.data;
  console.log(data.quizzes);
});
```

### Using `ListQuizzes`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listQuizzesRef } from '@dataconnect/generated';


// Call the `listQuizzesRef()` function to get a reference to the query.
const ref = listQuizzesRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listQuizzesRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.quizzes);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.quizzes);
});
```

## GetQuestion
You can execute the `GetQuestion` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getQuestion(vars: GetQuestionVariables, options?: ExecuteQueryOptions): QueryPromise<GetQuestionData, GetQuestionVariables>;

interface GetQuestionRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetQuestionVariables): QueryRef<GetQuestionData, GetQuestionVariables>;
}
export const getQuestionRef: GetQuestionRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getQuestion(dc: DataConnect, vars: GetQuestionVariables, options?: ExecuteQueryOptions): QueryPromise<GetQuestionData, GetQuestionVariables>;

interface GetQuestionRef {
  ...
  (dc: DataConnect, vars: GetQuestionVariables): QueryRef<GetQuestionData, GetQuestionVariables>;
}
export const getQuestionRef: GetQuestionRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getQuestionRef:
```typescript
const name = getQuestionRef.operationName;
console.log(name);
```

### Variables
The `GetQuestion` query requires an argument of type `GetQuestionVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetQuestionVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `GetQuestion` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetQuestionData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetQuestionData {
  question?: {
    prompt: string;
    options: string[];
  };
}
```
### Using `GetQuestion`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getQuestion, GetQuestionVariables } from '@dataconnect/generated';

// The `GetQuestion` query requires an argument of type `GetQuestionVariables`:
const getQuestionVars: GetQuestionVariables = {
  id: ..., 
};

// Call the `getQuestion()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getQuestion(getQuestionVars);
// Variables can be defined inline as well.
const { data } = await getQuestion({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getQuestion(dataConnect, getQuestionVars);

console.log(data.question);

// Or, you can use the `Promise` API.
getQuestion(getQuestionVars).then((response) => {
  const data = response.data;
  console.log(data.question);
});
```

### Using `GetQuestion`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getQuestionRef, GetQuestionVariables } from '@dataconnect/generated';

// The `GetQuestion` query requires an argument of type `GetQuestionVariables`:
const getQuestionVars: GetQuestionVariables = {
  id: ..., 
};

// Call the `getQuestionRef()` function to get a reference to the query.
const ref = getQuestionRef(getQuestionVars);
// Variables can be defined inline as well.
const ref = getQuestionRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getQuestionRef(dataConnect, getQuestionVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.question);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.question);
});
```

## ListQuestions
You can execute the `ListQuestions` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listQuestions(options?: ExecuteQueryOptions): QueryPromise<ListQuestionsData, undefined>;

interface ListQuestionsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListQuestionsData, undefined>;
}
export const listQuestionsRef: ListQuestionsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listQuestions(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListQuestionsData, undefined>;

interface ListQuestionsRef {
  ...
  (dc: DataConnect): QueryRef<ListQuestionsData, undefined>;
}
export const listQuestionsRef: ListQuestionsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listQuestionsRef:
```typescript
const name = listQuestionsRef.operationName;
console.log(name);
```

### Variables
The `ListQuestions` query has no variables.
### Return Type
Recall that executing the `ListQuestions` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListQuestionsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListQuestionsData {
  questions: ({
    prompt: string;
  })[];
}
```
### Using `ListQuestions`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listQuestions } from '@dataconnect/generated';


// Call the `listQuestions()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listQuestions();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listQuestions(dataConnect);

console.log(data.questions);

// Or, you can use the `Promise` API.
listQuestions().then((response) => {
  const data = response.data;
  console.log(data.questions);
});
```

### Using `ListQuestions`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listQuestionsRef } from '@dataconnect/generated';


// Call the `listQuestionsRef()` function to get a reference to the query.
const ref = listQuestionsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listQuestionsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.questions);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.questions);
});
```

## GetMyBookmark
You can execute the `GetMyBookmark` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getMyBookmark(vars: GetMyBookmarkVariables, options?: ExecuteQueryOptions): QueryPromise<GetMyBookmarkData, GetMyBookmarkVariables>;

interface GetMyBookmarkRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetMyBookmarkVariables): QueryRef<GetMyBookmarkData, GetMyBookmarkVariables>;
}
export const getMyBookmarkRef: GetMyBookmarkRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getMyBookmark(dc: DataConnect, vars: GetMyBookmarkVariables, options?: ExecuteQueryOptions): QueryPromise<GetMyBookmarkData, GetMyBookmarkVariables>;

interface GetMyBookmarkRef {
  ...
  (dc: DataConnect, vars: GetMyBookmarkVariables): QueryRef<GetMyBookmarkData, GetMyBookmarkVariables>;
}
export const getMyBookmarkRef: GetMyBookmarkRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getMyBookmarkRef:
```typescript
const name = getMyBookmarkRef.operationName;
console.log(name);
```

### Variables
The `GetMyBookmark` query requires an argument of type `GetMyBookmarkVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetMyBookmarkVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `GetMyBookmark` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetMyBookmarkData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetMyBookmarkData {
  userBookmark?: {
    userId: UUIDString;
    contentId: UUIDString;
    contentType: string;
    note?: string | null;
  };
}
```
### Using `GetMyBookmark`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getMyBookmark, GetMyBookmarkVariables } from '@dataconnect/generated';

// The `GetMyBookmark` query requires an argument of type `GetMyBookmarkVariables`:
const getMyBookmarkVars: GetMyBookmarkVariables = {
  id: ..., 
};

// Call the `getMyBookmark()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getMyBookmark(getMyBookmarkVars);
// Variables can be defined inline as well.
const { data } = await getMyBookmark({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getMyBookmark(dataConnect, getMyBookmarkVars);

console.log(data.userBookmark);

// Or, you can use the `Promise` API.
getMyBookmark(getMyBookmarkVars).then((response) => {
  const data = response.data;
  console.log(data.userBookmark);
});
```

### Using `GetMyBookmark`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getMyBookmarkRef, GetMyBookmarkVariables } from '@dataconnect/generated';

// The `GetMyBookmark` query requires an argument of type `GetMyBookmarkVariables`:
const getMyBookmarkVars: GetMyBookmarkVariables = {
  id: ..., 
};

// Call the `getMyBookmarkRef()` function to get a reference to the query.
const ref = getMyBookmarkRef(getMyBookmarkVars);
// Variables can be defined inline as well.
const ref = getMyBookmarkRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getMyBookmarkRef(dataConnect, getMyBookmarkVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.userBookmark);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.userBookmark);
});
```

## ListMyBookmarks
You can execute the `ListMyBookmarks` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listMyBookmarks(options?: ExecuteQueryOptions): QueryPromise<ListMyBookmarksData, undefined>;

interface ListMyBookmarksRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListMyBookmarksData, undefined>;
}
export const listMyBookmarksRef: ListMyBookmarksRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listMyBookmarks(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListMyBookmarksData, undefined>;

interface ListMyBookmarksRef {
  ...
  (dc: DataConnect): QueryRef<ListMyBookmarksData, undefined>;
}
export const listMyBookmarksRef: ListMyBookmarksRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listMyBookmarksRef:
```typescript
const name = listMyBookmarksRef.operationName;
console.log(name);
```

### Variables
The `ListMyBookmarks` query has no variables.
### Return Type
Recall that executing the `ListMyBookmarks` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListMyBookmarksData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListMyBookmarksData {
  userBookmarks: ({
    contentId: UUIDString;
    contentType: string;
    note?: string | null;
  })[];
}
```
### Using `ListMyBookmarks`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listMyBookmarks } from '@dataconnect/generated';


// Call the `listMyBookmarks()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listMyBookmarks();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listMyBookmarks(dataConnect);

console.log(data.userBookmarks);

// Or, you can use the `Promise` API.
listMyBookmarks().then((response) => {
  const data = response.data;
  console.log(data.userBookmarks);
});
```

### Using `ListMyBookmarks`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listMyBookmarksRef } from '@dataconnect/generated';


// Call the `listMyBookmarksRef()` function to get a reference to the query.
const ref = listMyBookmarksRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listMyBookmarksRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.userBookmarks);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.userBookmarks);
});
```

## GetMyStudyCard
You can execute the `GetMyStudyCard` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getMyStudyCard(vars: GetMyStudyCardVariables, options?: ExecuteQueryOptions): QueryPromise<GetMyStudyCardData, GetMyStudyCardVariables>;

interface GetMyStudyCardRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetMyStudyCardVariables): QueryRef<GetMyStudyCardData, GetMyStudyCardVariables>;
}
export const getMyStudyCardRef: GetMyStudyCardRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getMyStudyCard(dc: DataConnect, vars: GetMyStudyCardVariables, options?: ExecuteQueryOptions): QueryPromise<GetMyStudyCardData, GetMyStudyCardVariables>;

interface GetMyStudyCardRef {
  ...
  (dc: DataConnect, vars: GetMyStudyCardVariables): QueryRef<GetMyStudyCardData, GetMyStudyCardVariables>;
}
export const getMyStudyCardRef: GetMyStudyCardRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getMyStudyCardRef:
```typescript
const name = getMyStudyCardRef.operationName;
console.log(name);
```

### Variables
The `GetMyStudyCard` query requires an argument of type `GetMyStudyCardVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetMyStudyCardVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `GetMyStudyCard` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetMyStudyCardData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetMyStudyCardData {
  studyCard?: {
    front: string;
    back: string;
    citationReference: string;
  };
}
```
### Using `GetMyStudyCard`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getMyStudyCard, GetMyStudyCardVariables } from '@dataconnect/generated';

// The `GetMyStudyCard` query requires an argument of type `GetMyStudyCardVariables`:
const getMyStudyCardVars: GetMyStudyCardVariables = {
  id: ..., 
};

// Call the `getMyStudyCard()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getMyStudyCard(getMyStudyCardVars);
// Variables can be defined inline as well.
const { data } = await getMyStudyCard({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getMyStudyCard(dataConnect, getMyStudyCardVars);

console.log(data.studyCard);

// Or, you can use the `Promise` API.
getMyStudyCard(getMyStudyCardVars).then((response) => {
  const data = response.data;
  console.log(data.studyCard);
});
```

### Using `GetMyStudyCard`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getMyStudyCardRef, GetMyStudyCardVariables } from '@dataconnect/generated';

// The `GetMyStudyCard` query requires an argument of type `GetMyStudyCardVariables`:
const getMyStudyCardVars: GetMyStudyCardVariables = {
  id: ..., 
};

// Call the `getMyStudyCardRef()` function to get a reference to the query.
const ref = getMyStudyCardRef(getMyStudyCardVars);
// Variables can be defined inline as well.
const ref = getMyStudyCardRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getMyStudyCardRef(dataConnect, getMyStudyCardVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.studyCard);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.studyCard);
});
```

## ListMyStudyCards
You can execute the `ListMyStudyCards` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listMyStudyCards(options?: ExecuteQueryOptions): QueryPromise<ListMyStudyCardsData, undefined>;

interface ListMyStudyCardsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListMyStudyCardsData, undefined>;
}
export const listMyStudyCardsRef: ListMyStudyCardsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listMyStudyCards(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListMyStudyCardsData, undefined>;

interface ListMyStudyCardsRef {
  ...
  (dc: DataConnect): QueryRef<ListMyStudyCardsData, undefined>;
}
export const listMyStudyCardsRef: ListMyStudyCardsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listMyStudyCardsRef:
```typescript
const name = listMyStudyCardsRef.operationName;
console.log(name);
```

### Variables
The `ListMyStudyCards` query has no variables.
### Return Type
Recall that executing the `ListMyStudyCards` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListMyStudyCardsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListMyStudyCardsData {
  studyCards: ({
    front: string;
    back: string;
  })[];
}
```
### Using `ListMyStudyCards`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listMyStudyCards } from '@dataconnect/generated';


// Call the `listMyStudyCards()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listMyStudyCards();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listMyStudyCards(dataConnect);

console.log(data.studyCards);

// Or, you can use the `Promise` API.
listMyStudyCards().then((response) => {
  const data = response.data;
  console.log(data.studyCards);
});
```

### Using `ListMyStudyCards`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listMyStudyCardsRef } from '@dataconnect/generated';


// Call the `listMyStudyCardsRef()` function to get a reference to the query.
const ref = listMyStudyCardsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listMyStudyCardsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.studyCards);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.studyCards);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## CreateRegulation
You can execute the `CreateRegulation` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createRegulation(): MutationPromise<CreateRegulationData, undefined>;

interface CreateRegulationRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<CreateRegulationData, undefined>;
}
export const createRegulationRef: CreateRegulationRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createRegulation(dc: DataConnect): MutationPromise<CreateRegulationData, undefined>;

interface CreateRegulationRef {
  ...
  (dc: DataConnect): MutationRef<CreateRegulationData, undefined>;
}
export const createRegulationRef: CreateRegulationRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createRegulationRef:
```typescript
const name = createRegulationRef.operationName;
console.log(name);
```

### Variables
The `CreateRegulation` mutation has no variables.
### Return Type
Recall that executing the `CreateRegulation` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateRegulationData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateRegulationData {
  regulation_insert: Regulation_Key;
}
```
### Using `CreateRegulation`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createRegulation } from '@dataconnect/generated';


// Call the `createRegulation()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createRegulation();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createRegulation(dataConnect);

console.log(data.regulation_insert);

// Or, you can use the `Promise` API.
createRegulation().then((response) => {
  const data = response.data;
  console.log(data.regulation_insert);
});
```

### Using `CreateRegulation`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createRegulationRef } from '@dataconnect/generated';


// Call the `createRegulationRef()` function to get a reference to the mutation.
const ref = createRegulationRef();

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createRegulationRef(dataConnect);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.regulation_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.regulation_insert);
});
```

## UpdateRegulation
You can execute the `UpdateRegulation` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
updateRegulation(vars: UpdateRegulationVariables): MutationPromise<UpdateRegulationData, UpdateRegulationVariables>;

interface UpdateRegulationRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateRegulationVariables): MutationRef<UpdateRegulationData, UpdateRegulationVariables>;
}
export const updateRegulationRef: UpdateRegulationRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateRegulation(dc: DataConnect, vars: UpdateRegulationVariables): MutationPromise<UpdateRegulationData, UpdateRegulationVariables>;

interface UpdateRegulationRef {
  ...
  (dc: DataConnect, vars: UpdateRegulationVariables): MutationRef<UpdateRegulationData, UpdateRegulationVariables>;
}
export const updateRegulationRef: UpdateRegulationRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateRegulationRef:
```typescript
const name = updateRegulationRef.operationName;
console.log(name);
```

### Variables
The `UpdateRegulation` mutation requires an argument of type `UpdateRegulationVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpdateRegulationVariables {
  id: UUIDString;
  title?: string | null;
}
```
### Return Type
Recall that executing the `UpdateRegulation` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateRegulationData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateRegulationData {
  regulation_update?: Regulation_Key | null;
}
```
### Using `UpdateRegulation`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateRegulation, UpdateRegulationVariables } from '@dataconnect/generated';

// The `UpdateRegulation` mutation requires an argument of type `UpdateRegulationVariables`:
const updateRegulationVars: UpdateRegulationVariables = {
  id: ..., 
  title: ..., // optional
};

// Call the `updateRegulation()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateRegulation(updateRegulationVars);
// Variables can be defined inline as well.
const { data } = await updateRegulation({ id: ..., title: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateRegulation(dataConnect, updateRegulationVars);

console.log(data.regulation_update);

// Or, you can use the `Promise` API.
updateRegulation(updateRegulationVars).then((response) => {
  const data = response.data;
  console.log(data.regulation_update);
});
```

### Using `UpdateRegulation`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateRegulationRef, UpdateRegulationVariables } from '@dataconnect/generated';

// The `UpdateRegulation` mutation requires an argument of type `UpdateRegulationVariables`:
const updateRegulationVars: UpdateRegulationVariables = {
  id: ..., 
  title: ..., // optional
};

// Call the `updateRegulationRef()` function to get a reference to the mutation.
const ref = updateRegulationRef(updateRegulationVars);
// Variables can be defined inline as well.
const ref = updateRegulationRef({ id: ..., title: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateRegulationRef(dataConnect, updateRegulationVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.regulation_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.regulation_update);
});
```

## DeleteRegulation
You can execute the `DeleteRegulation` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
deleteRegulation(vars: DeleteRegulationVariables): MutationPromise<DeleteRegulationData, DeleteRegulationVariables>;

interface DeleteRegulationRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeleteRegulationVariables): MutationRef<DeleteRegulationData, DeleteRegulationVariables>;
}
export const deleteRegulationRef: DeleteRegulationRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
deleteRegulation(dc: DataConnect, vars: DeleteRegulationVariables): MutationPromise<DeleteRegulationData, DeleteRegulationVariables>;

interface DeleteRegulationRef {
  ...
  (dc: DataConnect, vars: DeleteRegulationVariables): MutationRef<DeleteRegulationData, DeleteRegulationVariables>;
}
export const deleteRegulationRef: DeleteRegulationRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the deleteRegulationRef:
```typescript
const name = deleteRegulationRef.operationName;
console.log(name);
```

### Variables
The `DeleteRegulation` mutation requires an argument of type `DeleteRegulationVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface DeleteRegulationVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `DeleteRegulation` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `DeleteRegulationData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface DeleteRegulationData {
  regulation_delete?: Regulation_Key | null;
}
```
### Using `DeleteRegulation`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, deleteRegulation, DeleteRegulationVariables } from '@dataconnect/generated';

// The `DeleteRegulation` mutation requires an argument of type `DeleteRegulationVariables`:
const deleteRegulationVars: DeleteRegulationVariables = {
  id: ..., 
};

// Call the `deleteRegulation()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await deleteRegulation(deleteRegulationVars);
// Variables can be defined inline as well.
const { data } = await deleteRegulation({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await deleteRegulation(dataConnect, deleteRegulationVars);

console.log(data.regulation_delete);

// Or, you can use the `Promise` API.
deleteRegulation(deleteRegulationVars).then((response) => {
  const data = response.data;
  console.log(data.regulation_delete);
});
```

### Using `DeleteRegulation`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, deleteRegulationRef, DeleteRegulationVariables } from '@dataconnect/generated';

// The `DeleteRegulation` mutation requires an argument of type `DeleteRegulationVariables`:
const deleteRegulationVars: DeleteRegulationVariables = {
  id: ..., 
};

// Call the `deleteRegulationRef()` function to get a reference to the mutation.
const ref = deleteRegulationRef(deleteRegulationVars);
// Variables can be defined inline as well.
const ref = deleteRegulationRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = deleteRegulationRef(dataConnect, deleteRegulationVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.regulation_delete);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.regulation_delete);
});
```

## CreateChart
You can execute the `CreateChart` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createChart(): MutationPromise<CreateChartData, undefined>;

interface CreateChartRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<CreateChartData, undefined>;
}
export const createChartRef: CreateChartRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createChart(dc: DataConnect): MutationPromise<CreateChartData, undefined>;

interface CreateChartRef {
  ...
  (dc: DataConnect): MutationRef<CreateChartData, undefined>;
}
export const createChartRef: CreateChartRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createChartRef:
```typescript
const name = createChartRef.operationName;
console.log(name);
```

### Variables
The `CreateChart` mutation has no variables.
### Return Type
Recall that executing the `CreateChart` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateChartData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateChartData {
  chart_insert: Chart_Key;
}
```
### Using `CreateChart`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createChart } from '@dataconnect/generated';


// Call the `createChart()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createChart();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createChart(dataConnect);

console.log(data.chart_insert);

// Or, you can use the `Promise` API.
createChart().then((response) => {
  const data = response.data;
  console.log(data.chart_insert);
});
```

### Using `CreateChart`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createChartRef } from '@dataconnect/generated';


// Call the `createChartRef()` function to get a reference to the mutation.
const ref = createChartRef();

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createChartRef(dataConnect);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.chart_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.chart_insert);
});
```

## UpdateChart
You can execute the `UpdateChart` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
updateChart(vars: UpdateChartVariables): MutationPromise<UpdateChartData, UpdateChartVariables>;

interface UpdateChartRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateChartVariables): MutationRef<UpdateChartData, UpdateChartVariables>;
}
export const updateChartRef: UpdateChartRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateChart(dc: DataConnect, vars: UpdateChartVariables): MutationPromise<UpdateChartData, UpdateChartVariables>;

interface UpdateChartRef {
  ...
  (dc: DataConnect, vars: UpdateChartVariables): MutationRef<UpdateChartData, UpdateChartVariables>;
}
export const updateChartRef: UpdateChartRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateChartRef:
```typescript
const name = updateChartRef.operationName;
console.log(name);
```

### Variables
The `UpdateChart` mutation requires an argument of type `UpdateChartVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpdateChartVariables {
  id: UUIDString;
  fileUrl?: string | null;
}
```
### Return Type
Recall that executing the `UpdateChart` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateChartData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateChartData {
  chart_update?: Chart_Key | null;
}
```
### Using `UpdateChart`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateChart, UpdateChartVariables } from '@dataconnect/generated';

// The `UpdateChart` mutation requires an argument of type `UpdateChartVariables`:
const updateChartVars: UpdateChartVariables = {
  id: ..., 
  fileUrl: ..., // optional
};

// Call the `updateChart()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateChart(updateChartVars);
// Variables can be defined inline as well.
const { data } = await updateChart({ id: ..., fileUrl: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateChart(dataConnect, updateChartVars);

console.log(data.chart_update);

// Or, you can use the `Promise` API.
updateChart(updateChartVars).then((response) => {
  const data = response.data;
  console.log(data.chart_update);
});
```

### Using `UpdateChart`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateChartRef, UpdateChartVariables } from '@dataconnect/generated';

// The `UpdateChart` mutation requires an argument of type `UpdateChartVariables`:
const updateChartVars: UpdateChartVariables = {
  id: ..., 
  fileUrl: ..., // optional
};

// Call the `updateChartRef()` function to get a reference to the mutation.
const ref = updateChartRef(updateChartVars);
// Variables can be defined inline as well.
const ref = updateChartRef({ id: ..., fileUrl: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateChartRef(dataConnect, updateChartVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.chart_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.chart_update);
});
```

## DeleteChart
You can execute the `DeleteChart` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
deleteChart(vars: DeleteChartVariables): MutationPromise<DeleteChartData, DeleteChartVariables>;

interface DeleteChartRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeleteChartVariables): MutationRef<DeleteChartData, DeleteChartVariables>;
}
export const deleteChartRef: DeleteChartRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
deleteChart(dc: DataConnect, vars: DeleteChartVariables): MutationPromise<DeleteChartData, DeleteChartVariables>;

interface DeleteChartRef {
  ...
  (dc: DataConnect, vars: DeleteChartVariables): MutationRef<DeleteChartData, DeleteChartVariables>;
}
export const deleteChartRef: DeleteChartRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the deleteChartRef:
```typescript
const name = deleteChartRef.operationName;
console.log(name);
```

### Variables
The `DeleteChart` mutation requires an argument of type `DeleteChartVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface DeleteChartVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `DeleteChart` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `DeleteChartData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface DeleteChartData {
  chart_delete?: Chart_Key | null;
}
```
### Using `DeleteChart`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, deleteChart, DeleteChartVariables } from '@dataconnect/generated';

// The `DeleteChart` mutation requires an argument of type `DeleteChartVariables`:
const deleteChartVars: DeleteChartVariables = {
  id: ..., 
};

// Call the `deleteChart()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await deleteChart(deleteChartVars);
// Variables can be defined inline as well.
const { data } = await deleteChart({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await deleteChart(dataConnect, deleteChartVars);

console.log(data.chart_delete);

// Or, you can use the `Promise` API.
deleteChart(deleteChartVars).then((response) => {
  const data = response.data;
  console.log(data.chart_delete);
});
```

### Using `DeleteChart`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, deleteChartRef, DeleteChartVariables } from '@dataconnect/generated';

// The `DeleteChart` mutation requires an argument of type `DeleteChartVariables`:
const deleteChartVars: DeleteChartVariables = {
  id: ..., 
};

// Call the `deleteChartRef()` function to get a reference to the mutation.
const ref = deleteChartRef(deleteChartVars);
// Variables can be defined inline as well.
const ref = deleteChartRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = deleteChartRef(dataConnect, deleteChartVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.chart_delete);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.chart_delete);
});
```

## CreateQuiz
You can execute the `CreateQuiz` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createQuiz(vars: CreateQuizVariables): MutationPromise<CreateQuizData, CreateQuizVariables>;

interface CreateQuizRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateQuizVariables): MutationRef<CreateQuizData, CreateQuizVariables>;
}
export const createQuizRef: CreateQuizRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createQuiz(dc: DataConnect, vars: CreateQuizVariables): MutationPromise<CreateQuizData, CreateQuizVariables>;

interface CreateQuizRef {
  ...
  (dc: DataConnect, vars: CreateQuizVariables): MutationRef<CreateQuizData, CreateQuizVariables>;
}
export const createQuizRef: CreateQuizRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createQuizRef:
```typescript
const name = createQuizRef.operationName;
console.log(name);
```

### Variables
The `CreateQuiz` mutation requires an argument of type `CreateQuizVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateQuizVariables {
  title: string;
  regId: UUIDString;
}
```
### Return Type
Recall that executing the `CreateQuiz` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateQuizData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateQuizData {
  quiz_insert: Quiz_Key;
}
```
### Using `CreateQuiz`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createQuiz, CreateQuizVariables } from '@dataconnect/generated';

// The `CreateQuiz` mutation requires an argument of type `CreateQuizVariables`:
const createQuizVars: CreateQuizVariables = {
  title: ..., 
  regId: ..., 
};

// Call the `createQuiz()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createQuiz(createQuizVars);
// Variables can be defined inline as well.
const { data } = await createQuiz({ title: ..., regId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createQuiz(dataConnect, createQuizVars);

console.log(data.quiz_insert);

// Or, you can use the `Promise` API.
createQuiz(createQuizVars).then((response) => {
  const data = response.data;
  console.log(data.quiz_insert);
});
```

### Using `CreateQuiz`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createQuizRef, CreateQuizVariables } from '@dataconnect/generated';

// The `CreateQuiz` mutation requires an argument of type `CreateQuizVariables`:
const createQuizVars: CreateQuizVariables = {
  title: ..., 
  regId: ..., 
};

// Call the `createQuizRef()` function to get a reference to the mutation.
const ref = createQuizRef(createQuizVars);
// Variables can be defined inline as well.
const ref = createQuizRef({ title: ..., regId: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createQuizRef(dataConnect, createQuizVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.quiz_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.quiz_insert);
});
```

## UpdateQuiz
You can execute the `UpdateQuiz` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
updateQuiz(vars: UpdateQuizVariables): MutationPromise<UpdateQuizData, UpdateQuizVariables>;

interface UpdateQuizRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateQuizVariables): MutationRef<UpdateQuizData, UpdateQuizVariables>;
}
export const updateQuizRef: UpdateQuizRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateQuiz(dc: DataConnect, vars: UpdateQuizVariables): MutationPromise<UpdateQuizData, UpdateQuizVariables>;

interface UpdateQuizRef {
  ...
  (dc: DataConnect, vars: UpdateQuizVariables): MutationRef<UpdateQuizData, UpdateQuizVariables>;
}
export const updateQuizRef: UpdateQuizRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateQuizRef:
```typescript
const name = updateQuizRef.operationName;
console.log(name);
```

### Variables
The `UpdateQuiz` mutation requires an argument of type `UpdateQuizVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpdateQuizVariables {
  id: UUIDString;
  title?: string | null;
}
```
### Return Type
Recall that executing the `UpdateQuiz` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateQuizData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateQuizData {
  quiz_update?: Quiz_Key | null;
}
```
### Using `UpdateQuiz`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateQuiz, UpdateQuizVariables } from '@dataconnect/generated';

// The `UpdateQuiz` mutation requires an argument of type `UpdateQuizVariables`:
const updateQuizVars: UpdateQuizVariables = {
  id: ..., 
  title: ..., // optional
};

// Call the `updateQuiz()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateQuiz(updateQuizVars);
// Variables can be defined inline as well.
const { data } = await updateQuiz({ id: ..., title: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateQuiz(dataConnect, updateQuizVars);

console.log(data.quiz_update);

// Or, you can use the `Promise` API.
updateQuiz(updateQuizVars).then((response) => {
  const data = response.data;
  console.log(data.quiz_update);
});
```

### Using `UpdateQuiz`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateQuizRef, UpdateQuizVariables } from '@dataconnect/generated';

// The `UpdateQuiz` mutation requires an argument of type `UpdateQuizVariables`:
const updateQuizVars: UpdateQuizVariables = {
  id: ..., 
  title: ..., // optional
};

// Call the `updateQuizRef()` function to get a reference to the mutation.
const ref = updateQuizRef(updateQuizVars);
// Variables can be defined inline as well.
const ref = updateQuizRef({ id: ..., title: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateQuizRef(dataConnect, updateQuizVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.quiz_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.quiz_update);
});
```

## DeleteQuiz
You can execute the `DeleteQuiz` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
deleteQuiz(vars: DeleteQuizVariables): MutationPromise<DeleteQuizData, DeleteQuizVariables>;

interface DeleteQuizRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeleteQuizVariables): MutationRef<DeleteQuizData, DeleteQuizVariables>;
}
export const deleteQuizRef: DeleteQuizRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
deleteQuiz(dc: DataConnect, vars: DeleteQuizVariables): MutationPromise<DeleteQuizData, DeleteQuizVariables>;

interface DeleteQuizRef {
  ...
  (dc: DataConnect, vars: DeleteQuizVariables): MutationRef<DeleteQuizData, DeleteQuizVariables>;
}
export const deleteQuizRef: DeleteQuizRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the deleteQuizRef:
```typescript
const name = deleteQuizRef.operationName;
console.log(name);
```

### Variables
The `DeleteQuiz` mutation requires an argument of type `DeleteQuizVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface DeleteQuizVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `DeleteQuiz` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `DeleteQuizData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface DeleteQuizData {
  quiz_delete?: Quiz_Key | null;
}
```
### Using `DeleteQuiz`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, deleteQuiz, DeleteQuizVariables } from '@dataconnect/generated';

// The `DeleteQuiz` mutation requires an argument of type `DeleteQuizVariables`:
const deleteQuizVars: DeleteQuizVariables = {
  id: ..., 
};

// Call the `deleteQuiz()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await deleteQuiz(deleteQuizVars);
// Variables can be defined inline as well.
const { data } = await deleteQuiz({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await deleteQuiz(dataConnect, deleteQuizVars);

console.log(data.quiz_delete);

// Or, you can use the `Promise` API.
deleteQuiz(deleteQuizVars).then((response) => {
  const data = response.data;
  console.log(data.quiz_delete);
});
```

### Using `DeleteQuiz`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, deleteQuizRef, DeleteQuizVariables } from '@dataconnect/generated';

// The `DeleteQuiz` mutation requires an argument of type `DeleteQuizVariables`:
const deleteQuizVars: DeleteQuizVariables = {
  id: ..., 
};

// Call the `deleteQuizRef()` function to get a reference to the mutation.
const ref = deleteQuizRef(deleteQuizVars);
// Variables can be defined inline as well.
const ref = deleteQuizRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = deleteQuizRef(dataConnect, deleteQuizVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.quiz_delete);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.quiz_delete);
});
```

## CreateQuestion
You can execute the `CreateQuestion` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createQuestion(vars: CreateQuestionVariables): MutationPromise<CreateQuestionData, CreateQuestionVariables>;

interface CreateQuestionRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateQuestionVariables): MutationRef<CreateQuestionData, CreateQuestionVariables>;
}
export const createQuestionRef: CreateQuestionRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createQuestion(dc: DataConnect, vars: CreateQuestionVariables): MutationPromise<CreateQuestionData, CreateQuestionVariables>;

interface CreateQuestionRef {
  ...
  (dc: DataConnect, vars: CreateQuestionVariables): MutationRef<CreateQuestionData, CreateQuestionVariables>;
}
export const createQuestionRef: CreateQuestionRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createQuestionRef:
```typescript
const name = createQuestionRef.operationName;
console.log(name);
```

### Variables
The `CreateQuestion` mutation requires an argument of type `CreateQuestionVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateQuestionVariables {
  prompt: string;
  answer: string;
  options: string[];
  citation: string;
  quizId: UUIDString;
}
```
### Return Type
Recall that executing the `CreateQuestion` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateQuestionData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateQuestionData {
  question_insert: Question_Key;
}
```
### Using `CreateQuestion`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createQuestion, CreateQuestionVariables } from '@dataconnect/generated';

// The `CreateQuestion` mutation requires an argument of type `CreateQuestionVariables`:
const createQuestionVars: CreateQuestionVariables = {
  prompt: ..., 
  answer: ..., 
  options: ..., 
  citation: ..., 
  quizId: ..., 
};

// Call the `createQuestion()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createQuestion(createQuestionVars);
// Variables can be defined inline as well.
const { data } = await createQuestion({ prompt: ..., answer: ..., options: ..., citation: ..., quizId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createQuestion(dataConnect, createQuestionVars);

console.log(data.question_insert);

// Or, you can use the `Promise` API.
createQuestion(createQuestionVars).then((response) => {
  const data = response.data;
  console.log(data.question_insert);
});
```

### Using `CreateQuestion`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createQuestionRef, CreateQuestionVariables } from '@dataconnect/generated';

// The `CreateQuestion` mutation requires an argument of type `CreateQuestionVariables`:
const createQuestionVars: CreateQuestionVariables = {
  prompt: ..., 
  answer: ..., 
  options: ..., 
  citation: ..., 
  quizId: ..., 
};

// Call the `createQuestionRef()` function to get a reference to the mutation.
const ref = createQuestionRef(createQuestionVars);
// Variables can be defined inline as well.
const ref = createQuestionRef({ prompt: ..., answer: ..., options: ..., citation: ..., quizId: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createQuestionRef(dataConnect, createQuestionVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.question_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.question_insert);
});
```

## UpdateQuestion
You can execute the `UpdateQuestion` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
updateQuestion(vars: UpdateQuestionVariables): MutationPromise<UpdateQuestionData, UpdateQuestionVariables>;

interface UpdateQuestionRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateQuestionVariables): MutationRef<UpdateQuestionData, UpdateQuestionVariables>;
}
export const updateQuestionRef: UpdateQuestionRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateQuestion(dc: DataConnect, vars: UpdateQuestionVariables): MutationPromise<UpdateQuestionData, UpdateQuestionVariables>;

interface UpdateQuestionRef {
  ...
  (dc: DataConnect, vars: UpdateQuestionVariables): MutationRef<UpdateQuestionData, UpdateQuestionVariables>;
}
export const updateQuestionRef: UpdateQuestionRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateQuestionRef:
```typescript
const name = updateQuestionRef.operationName;
console.log(name);
```

### Variables
The `UpdateQuestion` mutation requires an argument of type `UpdateQuestionVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpdateQuestionVariables {
  id: UUIDString;
  prompt?: string | null;
}
```
### Return Type
Recall that executing the `UpdateQuestion` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateQuestionData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateQuestionData {
  question_update?: Question_Key | null;
}
```
### Using `UpdateQuestion`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateQuestion, UpdateQuestionVariables } from '@dataconnect/generated';

// The `UpdateQuestion` mutation requires an argument of type `UpdateQuestionVariables`:
const updateQuestionVars: UpdateQuestionVariables = {
  id: ..., 
  prompt: ..., // optional
};

// Call the `updateQuestion()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateQuestion(updateQuestionVars);
// Variables can be defined inline as well.
const { data } = await updateQuestion({ id: ..., prompt: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateQuestion(dataConnect, updateQuestionVars);

console.log(data.question_update);

// Or, you can use the `Promise` API.
updateQuestion(updateQuestionVars).then((response) => {
  const data = response.data;
  console.log(data.question_update);
});
```

### Using `UpdateQuestion`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateQuestionRef, UpdateQuestionVariables } from '@dataconnect/generated';

// The `UpdateQuestion` mutation requires an argument of type `UpdateQuestionVariables`:
const updateQuestionVars: UpdateQuestionVariables = {
  id: ..., 
  prompt: ..., // optional
};

// Call the `updateQuestionRef()` function to get a reference to the mutation.
const ref = updateQuestionRef(updateQuestionVars);
// Variables can be defined inline as well.
const ref = updateQuestionRef({ id: ..., prompt: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateQuestionRef(dataConnect, updateQuestionVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.question_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.question_update);
});
```

## DeleteQuestion
You can execute the `DeleteQuestion` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
deleteQuestion(vars: DeleteQuestionVariables): MutationPromise<DeleteQuestionData, DeleteQuestionVariables>;

interface DeleteQuestionRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeleteQuestionVariables): MutationRef<DeleteQuestionData, DeleteQuestionVariables>;
}
export const deleteQuestionRef: DeleteQuestionRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
deleteQuestion(dc: DataConnect, vars: DeleteQuestionVariables): MutationPromise<DeleteQuestionData, DeleteQuestionVariables>;

interface DeleteQuestionRef {
  ...
  (dc: DataConnect, vars: DeleteQuestionVariables): MutationRef<DeleteQuestionData, DeleteQuestionVariables>;
}
export const deleteQuestionRef: DeleteQuestionRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the deleteQuestionRef:
```typescript
const name = deleteQuestionRef.operationName;
console.log(name);
```

### Variables
The `DeleteQuestion` mutation requires an argument of type `DeleteQuestionVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface DeleteQuestionVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `DeleteQuestion` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `DeleteQuestionData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface DeleteQuestionData {
  question_delete?: Question_Key | null;
}
```
### Using `DeleteQuestion`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, deleteQuestion, DeleteQuestionVariables } from '@dataconnect/generated';

// The `DeleteQuestion` mutation requires an argument of type `DeleteQuestionVariables`:
const deleteQuestionVars: DeleteQuestionVariables = {
  id: ..., 
};

// Call the `deleteQuestion()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await deleteQuestion(deleteQuestionVars);
// Variables can be defined inline as well.
const { data } = await deleteQuestion({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await deleteQuestion(dataConnect, deleteQuestionVars);

console.log(data.question_delete);

// Or, you can use the `Promise` API.
deleteQuestion(deleteQuestionVars).then((response) => {
  const data = response.data;
  console.log(data.question_delete);
});
```

### Using `DeleteQuestion`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, deleteQuestionRef, DeleteQuestionVariables } from '@dataconnect/generated';

// The `DeleteQuestion` mutation requires an argument of type `DeleteQuestionVariables`:
const deleteQuestionVars: DeleteQuestionVariables = {
  id: ..., 
};

// Call the `deleteQuestionRef()` function to get a reference to the mutation.
const ref = deleteQuestionRef(deleteQuestionVars);
// Variables can be defined inline as well.
const ref = deleteQuestionRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = deleteQuestionRef(dataConnect, deleteQuestionVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.question_delete);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.question_delete);
});
```

## CreateBookmark
You can execute the `CreateBookmark` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createBookmark(vars: CreateBookmarkVariables): MutationPromise<CreateBookmarkData, CreateBookmarkVariables>;

interface CreateBookmarkRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateBookmarkVariables): MutationRef<CreateBookmarkData, CreateBookmarkVariables>;
}
export const createBookmarkRef: CreateBookmarkRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createBookmark(dc: DataConnect, vars: CreateBookmarkVariables): MutationPromise<CreateBookmarkData, CreateBookmarkVariables>;

interface CreateBookmarkRef {
  ...
  (dc: DataConnect, vars: CreateBookmarkVariables): MutationRef<CreateBookmarkData, CreateBookmarkVariables>;
}
export const createBookmarkRef: CreateBookmarkRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createBookmarkRef:
```typescript
const name = createBookmarkRef.operationName;
console.log(name);
```

### Variables
The `CreateBookmark` mutation requires an argument of type `CreateBookmarkVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateBookmarkVariables {
  contentId: UUIDString;
  contentType: string;
  regId?: UUIDString | null;
  chartId?: UUIDString | null;
}
```
### Return Type
Recall that executing the `CreateBookmark` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateBookmarkData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateBookmarkData {
  userBookmark_insert: UserBookmark_Key;
}
```
### Using `CreateBookmark`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createBookmark, CreateBookmarkVariables } from '@dataconnect/generated';

// The `CreateBookmark` mutation requires an argument of type `CreateBookmarkVariables`:
const createBookmarkVars: CreateBookmarkVariables = {
  contentId: ..., 
  contentType: ..., 
  regId: ..., // optional
  chartId: ..., // optional
};

// Call the `createBookmark()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createBookmark(createBookmarkVars);
// Variables can be defined inline as well.
const { data } = await createBookmark({ contentId: ..., contentType: ..., regId: ..., chartId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createBookmark(dataConnect, createBookmarkVars);

console.log(data.userBookmark_insert);

// Or, you can use the `Promise` API.
createBookmark(createBookmarkVars).then((response) => {
  const data = response.data;
  console.log(data.userBookmark_insert);
});
```

### Using `CreateBookmark`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createBookmarkRef, CreateBookmarkVariables } from '@dataconnect/generated';

// The `CreateBookmark` mutation requires an argument of type `CreateBookmarkVariables`:
const createBookmarkVars: CreateBookmarkVariables = {
  contentId: ..., 
  contentType: ..., 
  regId: ..., // optional
  chartId: ..., // optional
};

// Call the `createBookmarkRef()` function to get a reference to the mutation.
const ref = createBookmarkRef(createBookmarkVars);
// Variables can be defined inline as well.
const ref = createBookmarkRef({ contentId: ..., contentType: ..., regId: ..., chartId: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createBookmarkRef(dataConnect, createBookmarkVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.userBookmark_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.userBookmark_insert);
});
```

## UpdateBookmark
You can execute the `UpdateBookmark` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
updateBookmark(vars: UpdateBookmarkVariables): MutationPromise<UpdateBookmarkData, UpdateBookmarkVariables>;

interface UpdateBookmarkRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateBookmarkVariables): MutationRef<UpdateBookmarkData, UpdateBookmarkVariables>;
}
export const updateBookmarkRef: UpdateBookmarkRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateBookmark(dc: DataConnect, vars: UpdateBookmarkVariables): MutationPromise<UpdateBookmarkData, UpdateBookmarkVariables>;

interface UpdateBookmarkRef {
  ...
  (dc: DataConnect, vars: UpdateBookmarkVariables): MutationRef<UpdateBookmarkData, UpdateBookmarkVariables>;
}
export const updateBookmarkRef: UpdateBookmarkRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateBookmarkRef:
```typescript
const name = updateBookmarkRef.operationName;
console.log(name);
```

### Variables
The `UpdateBookmark` mutation requires an argument of type `UpdateBookmarkVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpdateBookmarkVariables {
  id: UUIDString;
  note?: string | null;
}
```
### Return Type
Recall that executing the `UpdateBookmark` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateBookmarkData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateBookmarkData {
  userBookmark_update?: UserBookmark_Key | null;
}
```
### Using `UpdateBookmark`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateBookmark, UpdateBookmarkVariables } from '@dataconnect/generated';

// The `UpdateBookmark` mutation requires an argument of type `UpdateBookmarkVariables`:
const updateBookmarkVars: UpdateBookmarkVariables = {
  id: ..., 
  note: ..., // optional
};

// Call the `updateBookmark()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateBookmark(updateBookmarkVars);
// Variables can be defined inline as well.
const { data } = await updateBookmark({ id: ..., note: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateBookmark(dataConnect, updateBookmarkVars);

console.log(data.userBookmark_update);

// Or, you can use the `Promise` API.
updateBookmark(updateBookmarkVars).then((response) => {
  const data = response.data;
  console.log(data.userBookmark_update);
});
```

### Using `UpdateBookmark`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateBookmarkRef, UpdateBookmarkVariables } from '@dataconnect/generated';

// The `UpdateBookmark` mutation requires an argument of type `UpdateBookmarkVariables`:
const updateBookmarkVars: UpdateBookmarkVariables = {
  id: ..., 
  note: ..., // optional
};

// Call the `updateBookmarkRef()` function to get a reference to the mutation.
const ref = updateBookmarkRef(updateBookmarkVars);
// Variables can be defined inline as well.
const ref = updateBookmarkRef({ id: ..., note: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateBookmarkRef(dataConnect, updateBookmarkVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.userBookmark_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.userBookmark_update);
});
```

## DeleteBookmark
You can execute the `DeleteBookmark` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
deleteBookmark(vars: DeleteBookmarkVariables): MutationPromise<DeleteBookmarkData, DeleteBookmarkVariables>;

interface DeleteBookmarkRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeleteBookmarkVariables): MutationRef<DeleteBookmarkData, DeleteBookmarkVariables>;
}
export const deleteBookmarkRef: DeleteBookmarkRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
deleteBookmark(dc: DataConnect, vars: DeleteBookmarkVariables): MutationPromise<DeleteBookmarkData, DeleteBookmarkVariables>;

interface DeleteBookmarkRef {
  ...
  (dc: DataConnect, vars: DeleteBookmarkVariables): MutationRef<DeleteBookmarkData, DeleteBookmarkVariables>;
}
export const deleteBookmarkRef: DeleteBookmarkRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the deleteBookmarkRef:
```typescript
const name = deleteBookmarkRef.operationName;
console.log(name);
```

### Variables
The `DeleteBookmark` mutation requires an argument of type `DeleteBookmarkVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface DeleteBookmarkVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `DeleteBookmark` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `DeleteBookmarkData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface DeleteBookmarkData {
  userBookmark_delete?: UserBookmark_Key | null;
}
```
### Using `DeleteBookmark`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, deleteBookmark, DeleteBookmarkVariables } from '@dataconnect/generated';

// The `DeleteBookmark` mutation requires an argument of type `DeleteBookmarkVariables`:
const deleteBookmarkVars: DeleteBookmarkVariables = {
  id: ..., 
};

// Call the `deleteBookmark()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await deleteBookmark(deleteBookmarkVars);
// Variables can be defined inline as well.
const { data } = await deleteBookmark({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await deleteBookmark(dataConnect, deleteBookmarkVars);

console.log(data.userBookmark_delete);

// Or, you can use the `Promise` API.
deleteBookmark(deleteBookmarkVars).then((response) => {
  const data = response.data;
  console.log(data.userBookmark_delete);
});
```

### Using `DeleteBookmark`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, deleteBookmarkRef, DeleteBookmarkVariables } from '@dataconnect/generated';

// The `DeleteBookmark` mutation requires an argument of type `DeleteBookmarkVariables`:
const deleteBookmarkVars: DeleteBookmarkVariables = {
  id: ..., 
};

// Call the `deleteBookmarkRef()` function to get a reference to the mutation.
const ref = deleteBookmarkRef(deleteBookmarkVars);
// Variables can be defined inline as well.
const ref = deleteBookmarkRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = deleteBookmarkRef(dataConnect, deleteBookmarkVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.userBookmark_delete);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.userBookmark_delete);
});
```

## CreateStudyCard
You can execute the `CreateStudyCard` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createStudyCard(vars: CreateStudyCardVariables): MutationPromise<CreateStudyCardData, CreateStudyCardVariables>;

interface CreateStudyCardRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateStudyCardVariables): MutationRef<CreateStudyCardData, CreateStudyCardVariables>;
}
export const createStudyCardRef: CreateStudyCardRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createStudyCard(dc: DataConnect, vars: CreateStudyCardVariables): MutationPromise<CreateStudyCardData, CreateStudyCardVariables>;

interface CreateStudyCardRef {
  ...
  (dc: DataConnect, vars: CreateStudyCardVariables): MutationRef<CreateStudyCardData, CreateStudyCardVariables>;
}
export const createStudyCardRef: CreateStudyCardRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createStudyCardRef:
```typescript
const name = createStudyCardRef.operationName;
console.log(name);
```

### Variables
The `CreateStudyCard` mutation requires an argument of type `CreateStudyCardVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateStudyCardVariables {
  front: string;
  back: string;
  citation: string;
}
```
### Return Type
Recall that executing the `CreateStudyCard` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateStudyCardData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateStudyCardData {
  studyCard_insert: StudyCard_Key;
}
```
### Using `CreateStudyCard`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createStudyCard, CreateStudyCardVariables } from '@dataconnect/generated';

// The `CreateStudyCard` mutation requires an argument of type `CreateStudyCardVariables`:
const createStudyCardVars: CreateStudyCardVariables = {
  front: ..., 
  back: ..., 
  citation: ..., 
};

// Call the `createStudyCard()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createStudyCard(createStudyCardVars);
// Variables can be defined inline as well.
const { data } = await createStudyCard({ front: ..., back: ..., citation: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createStudyCard(dataConnect, createStudyCardVars);

console.log(data.studyCard_insert);

// Or, you can use the `Promise` API.
createStudyCard(createStudyCardVars).then((response) => {
  const data = response.data;
  console.log(data.studyCard_insert);
});
```

### Using `CreateStudyCard`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createStudyCardRef, CreateStudyCardVariables } from '@dataconnect/generated';

// The `CreateStudyCard` mutation requires an argument of type `CreateStudyCardVariables`:
const createStudyCardVars: CreateStudyCardVariables = {
  front: ..., 
  back: ..., 
  citation: ..., 
};

// Call the `createStudyCardRef()` function to get a reference to the mutation.
const ref = createStudyCardRef(createStudyCardVars);
// Variables can be defined inline as well.
const ref = createStudyCardRef({ front: ..., back: ..., citation: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createStudyCardRef(dataConnect, createStudyCardVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.studyCard_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.studyCard_insert);
});
```

## UpdateStudyCard
You can execute the `UpdateStudyCard` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
updateStudyCard(vars: UpdateStudyCardVariables): MutationPromise<UpdateStudyCardData, UpdateStudyCardVariables>;

interface UpdateStudyCardRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateStudyCardVariables): MutationRef<UpdateStudyCardData, UpdateStudyCardVariables>;
}
export const updateStudyCardRef: UpdateStudyCardRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateStudyCard(dc: DataConnect, vars: UpdateStudyCardVariables): MutationPromise<UpdateStudyCardData, UpdateStudyCardVariables>;

interface UpdateStudyCardRef {
  ...
  (dc: DataConnect, vars: UpdateStudyCardVariables): MutationRef<UpdateStudyCardData, UpdateStudyCardVariables>;
}
export const updateStudyCardRef: UpdateStudyCardRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateStudyCardRef:
```typescript
const name = updateStudyCardRef.operationName;
console.log(name);
```

### Variables
The `UpdateStudyCard` mutation requires an argument of type `UpdateStudyCardVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpdateStudyCardVariables {
  id: UUIDString;
  front?: string | null;
}
```
### Return Type
Recall that executing the `UpdateStudyCard` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateStudyCardData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateStudyCardData {
  studyCard_update?: StudyCard_Key | null;
}
```
### Using `UpdateStudyCard`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateStudyCard, UpdateStudyCardVariables } from '@dataconnect/generated';

// The `UpdateStudyCard` mutation requires an argument of type `UpdateStudyCardVariables`:
const updateStudyCardVars: UpdateStudyCardVariables = {
  id: ..., 
  front: ..., // optional
};

// Call the `updateStudyCard()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateStudyCard(updateStudyCardVars);
// Variables can be defined inline as well.
const { data } = await updateStudyCard({ id: ..., front: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateStudyCard(dataConnect, updateStudyCardVars);

console.log(data.studyCard_update);

// Or, you can use the `Promise` API.
updateStudyCard(updateStudyCardVars).then((response) => {
  const data = response.data;
  console.log(data.studyCard_update);
});
```

### Using `UpdateStudyCard`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateStudyCardRef, UpdateStudyCardVariables } from '@dataconnect/generated';

// The `UpdateStudyCard` mutation requires an argument of type `UpdateStudyCardVariables`:
const updateStudyCardVars: UpdateStudyCardVariables = {
  id: ..., 
  front: ..., // optional
};

// Call the `updateStudyCardRef()` function to get a reference to the mutation.
const ref = updateStudyCardRef(updateStudyCardVars);
// Variables can be defined inline as well.
const ref = updateStudyCardRef({ id: ..., front: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateStudyCardRef(dataConnect, updateStudyCardVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.studyCard_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.studyCard_update);
});
```

## DeleteStudyCard
You can execute the `DeleteStudyCard` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
deleteStudyCard(vars: DeleteStudyCardVariables): MutationPromise<DeleteStudyCardData, DeleteStudyCardVariables>;

interface DeleteStudyCardRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeleteStudyCardVariables): MutationRef<DeleteStudyCardData, DeleteStudyCardVariables>;
}
export const deleteStudyCardRef: DeleteStudyCardRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
deleteStudyCard(dc: DataConnect, vars: DeleteStudyCardVariables): MutationPromise<DeleteStudyCardData, DeleteStudyCardVariables>;

interface DeleteStudyCardRef {
  ...
  (dc: DataConnect, vars: DeleteStudyCardVariables): MutationRef<DeleteStudyCardData, DeleteStudyCardVariables>;
}
export const deleteStudyCardRef: DeleteStudyCardRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the deleteStudyCardRef:
```typescript
const name = deleteStudyCardRef.operationName;
console.log(name);
```

### Variables
The `DeleteStudyCard` mutation requires an argument of type `DeleteStudyCardVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface DeleteStudyCardVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `DeleteStudyCard` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `DeleteStudyCardData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface DeleteStudyCardData {
  studyCard_delete?: StudyCard_Key | null;
}
```
### Using `DeleteStudyCard`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, deleteStudyCard, DeleteStudyCardVariables } from '@dataconnect/generated';

// The `DeleteStudyCard` mutation requires an argument of type `DeleteStudyCardVariables`:
const deleteStudyCardVars: DeleteStudyCardVariables = {
  id: ..., 
};

// Call the `deleteStudyCard()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await deleteStudyCard(deleteStudyCardVars);
// Variables can be defined inline as well.
const { data } = await deleteStudyCard({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await deleteStudyCard(dataConnect, deleteStudyCardVars);

console.log(data.studyCard_delete);

// Or, you can use the `Promise` API.
deleteStudyCard(deleteStudyCardVars).then((response) => {
  const data = response.data;
  console.log(data.studyCard_delete);
});
```

### Using `DeleteStudyCard`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, deleteStudyCardRef, DeleteStudyCardVariables } from '@dataconnect/generated';

// The `DeleteStudyCard` mutation requires an argument of type `DeleteStudyCardVariables`:
const deleteStudyCardVars: DeleteStudyCardVariables = {
  id: ..., 
};

// Call the `deleteStudyCardRef()` function to get a reference to the mutation.
const ref = deleteStudyCardRef(deleteStudyCardVars);
// Variables can be defined inline as well.
const ref = deleteStudyCardRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = deleteStudyCardRef(dataConnect, deleteStudyCardVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.studyCard_delete);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.studyCard_delete);
});
```

