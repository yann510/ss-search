import Grid from "@material-ui/core/Grid"
import Paper from "@material-ui/core/Paper"
import Typography from "@material-ui/core/Typography"
import TextField from "@material-ui/core/TextField"
import React from "react"
import { indexDocuments, search, tokenize } from "ss-search"
import { makeStyles } from "@material-ui/core/styles"
import { debounce, round, defer, get, keyBy } from "lodash"
import { Data } from "./models/data"
import DataTable from "./DataTable"
import TableHead from "@material-ui/core/TableHead"
import TableRow from "@material-ui/core/TableRow"
import TableCell from "@material-ui/core/TableCell"
import TableBody from "@material-ui/core/TableBody"
import Table from "@material-ui/core/Table"
import Fuse from "fuse.js"
import { CircularProgress } from "@material-ui/core"
import lunr from "lunr"
import * as JsSearch from "js-search"
import BackdropProgress from "./BackdropLoader"
const Flexsearch = require("flexsearch")
const fuzzysort = require("fuzzysort")

const useStyles = makeStyles((theme) => ({
    paper: {
        padding: theme.spacing(2),
        display: "flex",
        overflow: "auto",
        flexDirection: "column",
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

interface BenchmarkResult {
    libraryName: string
    indexationTimeMs: number
    searchResults: Data[]
    searchTimeMs: number
    isLoading: boolean
    indexationFn: (data: Data[]) => void
    searchFn: (data: Data[], searchText: string, ...params: any) => Data[]
}

interface Props {
    data: Data[]
}

const asyncDefer = (fn: () => void) => {
    return new Promise((resolve) => {
        defer(() => {
            fn()
            return resolve()
        })
    })
}

const debouncedSearches = debounce(
    async (
        searchText: string,
        data: Data[],
        dataById: { [index: number]: Data },
        benchmarkResults: BenchmarkResult[],
        setBenchmarkResults: any,
        setSearchWords: any,
        fuse: any,
        lunrIndex: any,
        jsSearch: any,
        flexsearch: any,
    ) => {
        setSearchWords(tokenize(searchText))

        for (let i = 0; i < benchmarkResults.length; i++) {
            let benchmarkResult = benchmarkResults[i]

            await asyncDefer(() => {
                const startTime = performance.now()
                const searchResults = benchmarkResult.searchFn(data, searchText, { fuse, lunrIndex, dataById, jsSearch, flexsearch })
                const searchTime = round(performance.now() - startTime, 2)

                benchmarkResults.splice(i, 1, { ...benchmarkResult, searchResults: searchResults, searchTimeMs: searchTime, isLoading: false })
                setBenchmarkResults([...benchmarkResults])
            })
        }
    },
    200,
)

function Benchmark(props: Props) {
    const { data } = props

    const classes = useStyles()

    const [searchText, setSearchText] = React.useState("")
    const [searchWords, setSearchWords] = React.useState<string[]>([])
    const [benchmarkResults, setBenchmarkResults] = React.useState<BenchmarkResult[]>([])
    const [fuse, setFuse] = React.useState<any>()
    const [lunrIndex, setLunrIndex] = React.useState<any>()
    const [jsSearch, setJsSearch] = React.useState<any>()
    const [flexsearch, setFlexsearch] = React.useState<any>()
    const [isIndexing, setIsIndexing] = React.useState(true)
    const [dataById, setDataById] = React.useState<{ [index: number]: Data }>({})

    React.useEffect(() => {
        if (data && data.length > 0) {
            const newDataReference = [...data]
            defer(() => {
                const benchmarkResults: BenchmarkResult[] = [
                    {
                        libraryName: "ss-search",
                        indexationFn: (data: Data[]) => indexDocuments(data, Object.keys(data[0])),
                        searchFn: (data: Data[], searchText: string) => search(data, Object.keys(data[0]), searchText),
                    },
                    {
                        libraryName: "fuse.js",
                        indexationFn: (data: Data[]) => setFuse(new Fuse(data, { keys: Object.keys(data[0]) })),
                        searchFn: (data: Data[], searchText: string, params: any) => (params.fuse.search(searchText) as { item: Data }[]).map((x) => x.item),
                    },
                    {
                        libraryName: "lunr.js",
                        indexationFn: (data: Data[]) => {
                            const idx = lunr(function () {
                                this.ref("id")
                                Object.keys(data[0])
                                    .filter((k) => k !== "id")
                                    .forEach((k) => this.field(k))

                                data.forEach(function (d) {
                                    // @ts-ignore
                                    this.add(d)
                                }, this)
                            })

                            setLunrIndex(idx)
                        },
                        searchFn: (data: Data[], searchText: string, params: any) =>
                            params.lunrIndex.search(searchText).map((x: { ref: string }) => get(params.dataById, x.ref)),
                    },
                    {
                        libraryName: "fuzzysort",
                        indexationFn: () => {},
                        searchFn: (data: Data[], searchText: string) =>
                            fuzzysort
                                .go(
                                    searchText,
                                    data.map((x) => ({ ...x, id: x.id.toString(), age: x.age.toString() })),
                                    {
                                        keys: Object.keys(data[0]),
                                    },
                                )
                                .map((x: { obj: Data }) => x.obj),
                    },
                    {
                        libraryName: "js-search",
                        indexationFn: (data: Data[]) => {
                            const search = new JsSearch.Search("id")
                            Object.keys(data[0]).forEach((k) => search.addIndex(k))
                            search.addDocuments(data)

                            setJsSearch(search)
                        },
                        searchFn: (data: Data[], searchText: string, params: any) => params.jsSearch.search(searchText),
                    },
                    {
                        libraryName: "flexsearch",
                        indexationFn: (data: Data[]) => {
                            const flexsearch = new Flexsearch({
                                doc: {
                                    id: "id",
                                    field: Object.keys(data[0]),
                                },
                            })
                            flexsearch.add(data)
                            setFlexsearch(flexsearch)
                        },
                        searchFn: (data: Data[], searchText: string, params: any) => params.flexsearch.search(searchText),
                    },
                ].map((x) => {
                    const startTime = performance.now()
                    x.indexationFn(newDataReference)
                    const indexationTimeMs = round(performance.now() - startTime, 2)

                    return { ...x, indexationTimeMs, searchResults: newDataReference, searchTimeMs: 0, isLoading: false }
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
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Paper className={classes.paper}>
                        <TextField className={classes.searchTextField} label="Search" value={searchText} onChange={(e) => handleSearch(e.target.value)} />
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
                </Grid>
                {benchmarkResults.map((benchmarkResult) => (
                    <Grid item xs={12} key={benchmarkResult.libraryName}>
                        <Paper className={classes.paper}>
                            <Typography className={classes.resultText} variant="body2">
                                {benchmarkResult.libraryName} results
                            </Typography>
                            <DataTable data={benchmarkResult.searchResults} searchWords={searchWords} />
                        </Paper>
                    </Grid>
                ))}
            </Grid>
        </>
    )
}

export default React.memo(Benchmark)
