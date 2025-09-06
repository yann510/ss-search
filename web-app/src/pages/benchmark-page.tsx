/* eslint-disable @typescript-eslint/ban-ts-comment,@typescript-eslint/no-empty-function */
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import React, { Dispatch } from 'react'
import { debounce, round, defer, get, keyBy } from 'lodash'
import { Data } from '../models/data'
import DataTable from '../components/data-table'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import TableBody from '@mui/material/TableBody'
import Table from '@mui/material/Table'
import Fuse from 'fuse.js'
import { CircularProgress } from '@mui/material'
import lunr from 'lunr'
import * as JsSearch from 'js-search'
import { BackdropProgress } from '../components/backdrop-loader'
import { makeStyles } from 'tss-react/mui'

import fuzzysort from 'fuzzysort'
// FlexSearch v0.7/v0.8 compatibility
// eslint-disable-next-line import/no-duplicates
import FlexSearch, { Document as FlexDocument } from 'flexsearch'
import { indexDocuments, search, tokenize } from '@yann510/ss-search'

interface BenchmarkResult {
  libraryName: string
  indexationTimeMs: number
  searchResults: Data[]
  searchTimeMs: number
  isLoading: boolean
  indexationFn: (data: Data[]) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  searchFn: (data: Data[], searchText: string, ...params: any) => Data[]
}

interface Props {
  data: Data[]
}

const asyncDefer = (fn: () => void) => {
  return new Promise((resolve) => {
    defer(() => {
      fn()
      return resolve(null)
    })
  })
}

const debouncedSearches = debounce(
  async (
    searchText: string,
    data: Data[],
    dataById: { [index: number]: Data },
    benchmarkResults: BenchmarkResult[],
    setBenchmarkResults: Dispatch<React.SetStateAction<BenchmarkResult[]>>,
    setSearchWords: Dispatch<React.SetStateAction<string[]>>,
    fuse: Fuse<Data> | undefined,
    lunrIndex: lunr.Index | undefined,
    jsSearch: JsSearch.Search | undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    flexsearch: any,
  ) => {
    setSearchWords(tokenize(searchText))

    for (let i = 0; i < benchmarkResults.length; i++) {
      const benchmarkResult = benchmarkResults[i]

      await asyncDefer(() => {
        const startTime = performance.now()
        const searchResults = benchmarkResult.searchFn(data, searchText, {
          fuse,
          lunrIndex,
          dataById,
          jsSearch,
          flexsearch,
        })
        const searchTime = round(performance.now() - startTime, 2)

        benchmarkResults.splice(i, 1, {
          ...benchmarkResult,
          searchResults: searchResults,
          searchTimeMs: searchTime,
          isLoading: false,
        })
        setBenchmarkResults([...benchmarkResults])
      })
    }
  },
  200,
)

function BenchmarkPage(props: Props) {
  const { data } = props

  const { classes } = useStyles()

  const [searchText, setSearchText] = React.useState('')
  const [searchWords, setSearchWords] = React.useState<string[]>([])
  const [benchmarkResults, setBenchmarkResults] = React.useState<BenchmarkResult[]>([])
  const [fuse, setFuse] = React.useState<Fuse<Data>>()
  const [lunrIndex, setLunrIndex] = React.useState<lunr.Index | undefined>()
  const [jsSearch, setJsSearch] = React.useState<JsSearch.Search>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [flexsearch, setFlexsearch] = React.useState<any>()
  const [isIndexing, setIsIndexing] = React.useState(true)
  const [dataById, setDataById] = React.useState<{ [index: number]: Data }>({})

  React.useEffect(() => {
    if (data && data.length > 0) {
      const newDataReference = [...data]
      defer(() => {
        const benchmarkResults: BenchmarkResult[] = [
          {
            libraryName: 'ss-search',
            indexationFn: (data: Data[]) => indexDocuments(data, Object.keys(data[0]), null),
            searchFn: (data: Data[], searchText: string) => search(data, Object.keys(data[0]), searchText) as Data[],
          },
          {
            libraryName: 'lunr.js',
            indexationFn: (data: Data[]) => {
              const idx = lunr(function () {
                this.ref('id')
                Object.keys(data[0])
                  .filter((k) => k !== 'id')
                  .forEach((k) => this.field(k))

                data.forEach(function (d) {
                  // @ts-ignore
                  this.add(d)
                }, this)
              })

              setLunrIndex(idx)
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            searchFn: (_: Data[], searchText: string, params: any) =>
              params.lunrIndex.search(searchText).map((x: { ref: string }) => get(params.dataById, x.ref)),
          },
          {
            libraryName: 'fuzzysort',
            indexationFn: () => {},
            searchFn: (data: Data[], searchText: string) =>
              fuzzysort
                .go(
                  searchText,
                  data.map((x) => ({
                    ...x,
                    id: x.id.toString(),
                    age: x.age.toString(),
                  })),
                  {
                    keys: Object.keys(data[0]),
                  },
                )
                .map((x) => x.obj),
          },
          {
            libraryName: 'js-search',
            indexationFn: (data: Data[]) => {
              const search = new JsSearch.Search('id')
              Object.keys(data[0]).forEach((k) => search.addIndex(k))
              search.addDocuments(data)

              setJsSearch(search)
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            searchFn: (_: Data[], searchText: string, params: any) => params.jsSearch.search(searchText),
          },
          {
            libraryName: 'flexsearch',
            indexationFn: (data: Data[]) => {
              // Prefer Document API (v0.7+). Fallback to default if needed.
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              let instance: any
              const keys = Object.keys(data[0])
              try {
                // Prefer named export Document (v0.8)
                // @ts-ignore
                instance = new (FlexDocument as any)({
                  document: {
                    id: 'id',
                    index: keys,
                  },
                })
              } catch {
                // v0.7 style
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const AnyFlex: any = FlexSearch as any
                if (AnyFlex && AnyFlex.Document) {
                  instance = new AnyFlex.Document({
                    document: {
                      id: 'id',
                      index: keys,
                    },
                  })
                } else {
                  // Last resort: older constructor signature
                  instance = new (FlexSearch as unknown as { new (opts: unknown): unknown })({
                    doc: {
                      id: 'id',
                      field: keys,
                    },
                  })
                }
              }
              instance.add(data)
              setFlexsearch(instance)
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            searchFn: (_: Data[], searchText: string, params: any) => {
              const res = params.flexsearch.search(searchText, { enrich: true })
              // res could be an array of groups: [{ field, result: [{ id, score }, ...] }, ...]
              const resultsArray = Array.isArray(res) ? res : []
              const ids = resultsArray.flatMap((g: any) => (Array.isArray(g.result) ? g.result.map((r: any) => r.id) : []))
              return ids.map((id: string | number) => params.dataById[id]).filter(Boolean)
            },
          },
          {
            libraryName: 'fuse.js',
            indexationFn: (data: Data[]) => setFuse(new Fuse(data, { keys: Object.keys(data[0]) })),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            searchFn: (_: Data[], searchText: string, params: any) =>
              (params.fuse.search(searchText) as { item: Data }[]).map((x) => x.item),
          },
        ].map((x) => {
          const startTime = performance.now()
          x.indexationFn(newDataReference)
          const indexationTimeMs = round(performance.now() - startTime, 2)

          return {
            ...x,
            indexationTimeMs,
            searchResults: newDataReference,
            searchTimeMs: 0,
            isLoading: false,
          }
        })

        setBenchmarkResults(benchmarkResults)
        setDataById(keyBy(newDataReference, (x) => x.id))
        setIsIndexing(false)
      })
    }
  }, [data])

  const handleSearch = (searchText: string) => {
    setSearchText(searchText)
    const benchmarks = benchmarkResults.map((x) => ({ ...x, isLoading: true }))
    setBenchmarkResults(benchmarks)

    debouncedSearches(searchText, data, dataById, benchmarks, setBenchmarkResults, setSearchWords, fuse, lunrIndex, jsSearch, flexsearch)
  }

  return (
    <>
      <BackdropProgress isLoading={isIndexing} text="Indexing search libraries..." />
      <Stack spacing={3}>
        <Box>
          <Paper className={classes.paper}>
            <TextField
              className={classes.searchTextField}
              label="Search"
              value={searchText}
              onChange={(e) => handleSearch((e.target as HTMLInputElement).value)}
            />
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell className={classes.benchmarkTable}>Library</TableCell>
                  <TableCell className={classes.benchmarkTable}>Indexation Time (ms)</TableCell>
                  <TableCell className={classes.benchmarkTable}>Results Count</TableCell>
                  <TableCell className={classes.benchmarkTable}>Search Time (ms)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {benchmarkResults.map((benchmarkResult) => (
                  <TableRow key={benchmarkResult.libraryName}>
                    <TableCell className={classes.benchmarkTable}>{benchmarkResult.libraryName}</TableCell>
                    <TableCell className={classes.benchmarkTable}>
                      {isIndexing && <CircularProgress color="primary" size={16} />}
                      {!isIndexing && <>{benchmarkResult.indexationTimeMs}ms</>}
                    </TableCell>
                    <TableCell className={classes.benchmarkTable}>
                      {benchmarkResult.isLoading && <CircularProgress color="primary" size={16} />}
                      {!benchmarkResult.isLoading && <>{benchmarkResult.searchResults.length.toLocaleString()}</>}
                    </TableCell>
                    <TableCell className={classes.benchmarkTable}>
                      {benchmarkResult.isLoading && <CircularProgress color="primary" size={16} />}
                      {!benchmarkResult.isLoading && <>{benchmarkResult.searchTimeMs}ms</>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Box>
        {benchmarkResults.map((benchmarkResult) => (
          <Box key={benchmarkResult.libraryName}>
            <Paper className={classes.paper}>
              <Typography className={classes.resultText} variant="body2">
                {benchmarkResult.libraryName} results
              </Typography>
              <DataTable data={benchmarkResult.searchResults} searchWords={searchWords} />
            </Paper>
          </Box>
        ))}
      </Stack>
    </>
  )
}

export default React.memo(BenchmarkPage)

const useStyles = makeStyles()((theme) => ({
  paper: {
    padding: theme.spacing(2),
    display: 'flex',
    overflow: 'auto',
    flexDirection: 'column',
  },
  searchTextField: {
    marginBottom: theme.spacing(2),
  },
  resultText: {
    marginBottom: theme.spacing(2),
  },
  benchmarkTable: {
    fontSize: 16,
  },
}))
