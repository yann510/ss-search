import Grid from "@material-ui/core/Grid"
import Paper from "@material-ui/core/Paper"
import Typography from "@material-ui/core/Typography"
import TextField from "@material-ui/core/TextField"
import Table from "@material-ui/core/Table"
import TableHead from "@material-ui/core/TableHead"
import TableRow from "@material-ui/core/TableRow"
import TableCell from "@material-ui/core/TableCell"
import TableBody from "@material-ui/core/TableBody"
import Highlighter from "react-highlight-words"
import TableFooter from "@material-ui/core/TableFooter"
import TablePagination from "@material-ui/core/TablePagination"
import Box from "@material-ui/core/Box"
import React from "react"
import { search, tokenize } from "ss-search"
import { makeStyles } from "@material-ui/core/styles"
import axios from "axios"
import { debounce } from "lodash"
import { Backdrop, CircularProgress } from '@material-ui/core';

const useStyles = makeStyles((theme) => ({
    paper: {
        padding: theme.spacing(2),
        display: "flex",
        overflow: "auto",
        flexDirection: "column",
    },
    fixedHeight: {
        height: 240,
    },
    searchTextField: {
        marginBottom: theme.spacing(2),
    },
    backdrop: {
        zIndex: theme.zIndex.drawer + 1,
        color: '#fff',
    },
}))

export interface Data {
    id: string
    name: string
    age: number
    address: string
}

let startTime = performance.now()

function Demo() {
    const classes = useStyles()

    const [page, setPage] = React.useState(0)
    const [rowsPerPage, setRowsPerPage] = React.useState(10)
    const [searchText, setSearchText] = React.useState("")
    const [data, setData] = React.useState<Data[]>([])
    const [searchResults, setSearchResults] = React.useState<Data[]>(data)
    const [searchWords, setSearchWords] = React.useState<string[]>([])
    const [searchTime, setSearchTime] = React.useState(0)
    const [isLoading, setIsLoading] = React.useState(true)

    React.useEffect(() => {
        async function fetchData() {
            const response = await axios.get<Data[]>("data.json")
            setData(response.data)
            setSearchResults(response.data)
            setIsLoading(false)
        }
        fetchData().catch((e) => console.error(e))
    }, [])

    const handleChangePage = (event: any, newPage: number) => setPage(newPage)
    const handleChangeRowsPerPage = (event: any) => {
        setRowsPerPage(parseInt(event.target.value, 10))
        setPage(0)
    }

    const debouncedSearch = debounce((searchText: string) => {
        setSearchResults(search(data, Object.keys(data[0]), searchText) as Data[])

        const endTime = performance.now()
        setSearchTime(endTime - (startTime + 100)) // + 100 to account for the debounce time
    }, 100)
    const handleSearch = (searchText: string) => {
        startTime =  performance.now()

        console.log(searchText, data[0])
        setSearchText(searchText)
        setSearchWords(tokenize(searchText))
        debouncedSearch(searchText)
    }

    return (
        <>
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Paper className={classes.paper}>
                        <Backdrop className={classes.backdrop} open={isLoading}>
                            <CircularProgress color="inherit" />
                        </Backdrop>
                        <Typography variant="body2" color="textSecondary" align="right">{`Execution time ${Math.round(searchTime)}ms`}</Typography>
                        <TextField className={classes.searchTextField} label="Search" value={searchText} onChange={(e) => handleSearch(e.target.value)} />
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>ID</TableCell>
                                    <TableCell>Name</TableCell>
                                    <TableCell>Age</TableCell>
                                    <TableCell>Address</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {searchResults.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row) => (
                                    <TableRow key={row.id}>
                                        {Object.keys(row).map((key) => (
                                            <TableCell key={key}>
                                                <Highlighter searchWords={searchWords} textToHighlight={(row as any)[key].toString()} />
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                            <TableFooter>
                                <TableRow>
                                    <TablePagination
                                        style={{ border: "none" }}
                                        count={searchResults.length}
                                        page={page}
                                        rowsPerPage={rowsPerPage}
                                        onChangePage={handleChangePage}
                                        onChangeRowsPerPage={handleChangeRowsPerPage}
                                    />
                                </TableRow>
                            </TableFooter>
                        </Table>
                    </Paper>
                </Grid>
            </Grid>
            <Box pt={4}>
                <Typography variant="body2" color="textSecondary" align="center">
                    Stop searching, start finding.
                </Typography>
            </Box>
        </>
    )
}

export default Demo
