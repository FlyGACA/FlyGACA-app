# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.




### React
For each operation, there is a wrapper hook that can be used to call the operation.

Here are all of the hooks that get generated:
```ts
import { useCreateRegulation, useUpdateRegulation, useDeleteRegulation, useGetRegulation, useListRegulations, useCreateChart, useUpdateChart, useDeleteChart, useGetChart, useListCharts } from '@dataconnect/generated/react';
// The types of these hooks are available in react/index.d.ts

const { data, isPending, isSuccess, isError, error } = useCreateRegulation();

const { data, isPending, isSuccess, isError, error } = useUpdateRegulation(updateRegulationVars);

const { data, isPending, isSuccess, isError, error } = useDeleteRegulation(deleteRegulationVars);

const { data, isPending, isSuccess, isError, error } = useGetRegulation(getRegulationVars);

const { data, isPending, isSuccess, isError, error } = useListRegulations();

const { data, isPending, isSuccess, isError, error } = useCreateChart();

const { data, isPending, isSuccess, isError, error } = useUpdateChart(updateChartVars);

const { data, isPending, isSuccess, isError, error } = useDeleteChart(deleteChartVars);

const { data, isPending, isSuccess, isError, error } = useGetChart(getChartVars);

const { data, isPending, isSuccess, isError, error } = useListCharts();

```

Here's an example from a different generated SDK:

```ts
import { useListAllMovies } from '@dataconnect/generated/react';

function MyComponent() {
  const { isLoading, data, error } = useListAllMovies();
  if(isLoading) {
    return <div>Loading...</div>
  }
  if(error) {
    return <div> An Error Occurred: {error} </div>
  }
}

// App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MyComponent from './my-component';

function App() {
  const queryClient = new QueryClient();
  return <QueryClientProvider client={queryClient}>
    <MyComponent />
  </QueryClientProvider>
}
```



## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { createRegulation, updateRegulation, deleteRegulation, getRegulation, listRegulations, createChart, updateChart, deleteChart, getChart, listCharts } from '@dataconnect/generated';


// Operation CreateRegulation: 
const { data } = await CreateRegulation(dataConnect);

// Operation UpdateRegulation:  For variables, look at type UpdateRegulationVars in ../index.d.ts
const { data } = await UpdateRegulation(dataConnect, updateRegulationVars);

// Operation DeleteRegulation:  For variables, look at type DeleteRegulationVars in ../index.d.ts
const { data } = await DeleteRegulation(dataConnect, deleteRegulationVars);

// Operation GetRegulation:  For variables, look at type GetRegulationVars in ../index.d.ts
const { data } = await GetRegulation(dataConnect, getRegulationVars);

// Operation ListRegulations: 
const { data } = await ListRegulations(dataConnect);

// Operation CreateChart: 
const { data } = await CreateChart(dataConnect);

// Operation UpdateChart:  For variables, look at type UpdateChartVars in ../index.d.ts
const { data } = await UpdateChart(dataConnect, updateChartVars);

// Operation DeleteChart:  For variables, look at type DeleteChartVars in ../index.d.ts
const { data } = await DeleteChart(dataConnect, deleteChartVars);

// Operation GetChart:  For variables, look at type GetChartVars in ../index.d.ts
const { data } = await GetChart(dataConnect, getChartVars);

// Operation ListCharts: 
const { data } = await ListCharts(dataConnect);


```