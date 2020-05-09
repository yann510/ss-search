import Grid from "@material-ui/core/Grid"
import Paper from "@material-ui/core/Paper"
import Typography from "@material-ui/core/Typography"
import TextField from "@material-ui/core/TextField"
import React from "react"
import { indexDocuments, search, tokenize } from "ss-search"
import { makeStyles } from "@material-ui/core/styles"
import { debounce, round, defer } from "lodash"
import { Data } from "./models/data"
import DataTable from "./DataTable"
import TableHead from "@material-ui/core/TableHead"
import TableRow from "@material-ui/core/TableRow"
import TableCell from "@material-ui/core/TableCell"
import TableBody from "@material-ui/core/TableBody"
import Table from "@material-ui/core/Table"
import Fuse from "fuse.js"
import { CircularProgress } from "@material-ui/core"

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
    bootstrapTimeMs: number
    searchResults: Data[]
    searchTimeMs: number
    isLoading?: boolean
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
    async (searchText: string, data: Data[], benchmarkResults: BenchmarkResult[], setBenchmarkResults: any, setSearchWords: any, fuse: any) => {
        setSearchWords(tokenize(searchText))

        for (let i = 0; i < benchmarkResults.length; i++) {
            let benchmarkResult = benchmarkResults[i]

            await asyncDefer(() => {
                const startTime = performance.now()
                const searchResults = benchmarkResult.searchFn(data, searchText, fuse)
                const searchTime = round(performance.now() - startTime, 2)

                benchmarkResults.splice(i, 1, { ...benchmarkResult, searchResults: searchResults, searchTimeMs: searchTime, isLoading: false })
                setBenchmarkResults([...benchmarkResults])
            })
        }
    },
    200,
)

const getGeneratedId = () => Math.random().toString(36)

function Benchmark(props: Props) {
    const { data } = props

    const classes = useStyles()

    const [searchText, setSearchText] = React.useState("")
    const [searchWords, setSearchWords] = React.useState<string[]>([])
    const [benchmarkResults, setBenchmarkResults] = React.useState<BenchmarkResult[]>([])
    const [fuse, setFuse] = React.useState<any>()
    const [isBoostraping, setIsBoostraping] = React.useState(true)

    React.useEffect(() => {
        if (data && data.length > 0) {
            const ssSearchStartTime = performance.now()
            indexDocuments(data, Object.keys(data[0]))
            const ssSerachBoostrapTime = round(performance.now() - ssSearchStartTime)

            const fuseStartTime = performance.now()
            setFuse(new Fuse(data, { keys: Object.keys(data[0]) }))
            const fuseBoostrapTime = round(performance.now() - fuseStartTime)

            setBenchmarkResults([
                {
                    libraryName: "ss-search",
                    bootstrapTimeMs: ssSerachBoostrapTime,
                    searchResults: data,
                    searchTimeMs: 0,
                    searchFn: (data: Data[], searchText: string) => search(data, Object.keys(data[0]), searchText),
                },
                {
                    libraryName: "fuse.js",
                    bootstrapTimeMs: fuseBoostrapTime,
                    searchResults: data,
                    searchTimeMs: 0,
                    searchFn: (data: Data[], searchText: string, fuse: any) => fuse.search(searchText).map((x: { item: Data }) => x.item),
                },
            ])

            setIsBoostraping(false)
        }
    }, [data])

    const handleSearch = (searchText: string) => {
        setSearchText(searchText)
        const benchmarks = benchmarkResults.map((x) => ({ ...x, isLoading: true }))
        setBenchmarkResults(benchmarks)

        debouncedSearches(searchText, data, benchmarks, setBenchmarkResults, setSearchWords, fuse)
    }

    return (
        <>
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Paper className={classes.paper}>
                        <TextField className={classes.searchTextField} label="Search" value={searchText} onChange={(e) => handleSearch(e.target.value)} />
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell className={classes.benchmarkTable}>Library</TableCell>
                                    <TableCell className={classes.benchmarkTable}>Bootstrap Time (ms)</TableCell>
                                    <TableCell className={classes.benchmarkTable}>Results Count</TableCell>
                                    <TableCell className={classes.benchmarkTable}>Search Time (ms)</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {benchmarkResults.map((benchmarkResult) => (
                                    <TableRow key={benchmarkResult.libraryName}>
                                        <TableCell className={classes.benchmarkTable}>{benchmarkResult.libraryName}</TableCell>
                                        <TableCell className={classes.benchmarkTable}>
                                            {isBoostraping && <CircularProgress color="primary" size={16} />}
                                            {!isBoostraping && <>{benchmarkResult.bootstrapTimeMs}ms</>}
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
