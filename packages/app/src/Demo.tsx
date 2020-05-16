import Grid from "@material-ui/core/Grid"
import Paper from "@material-ui/core/Paper"
import Typography from "@material-ui/core/Typography"
import TextField from "@material-ui/core/TextField"
import React from "react"
import { indexDocuments, search, tokenize } from "ss-search"
import { makeStyles } from "@material-ui/core/styles"
import { debounce } from "lodash"
import { Data } from "./models/data"
import DataTable from "./DataTable"

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
}))

let startTime = performance.now()

const debounceTime = 200
const debouncedSearch = debounce((searchText: string, data: Data[], setSearchResults: any, setSearchTime: any) => {
    setSearchResults(search(data, Object.keys(data[0]), searchText))

    const endTime = performance.now()
    setSearchTime(endTime - (startTime + debounceTime))
}, debounceTime)

interface Props {
    data: Data[]
}

function Demo(props: Props) {
    const { data } = props

    const classes = useStyles()

    const [searchText, setSearchText] = React.useState("")
    const [searchResults, setSearchResults] = React.useState<Data[]>(data)
    const [searchWords, setSearchWords] = React.useState<string[]>([])
    const [searchTime, setSearchTime] = React.useState(0)

    React.useEffect(() => {
        if (data && data.length > 0) {
            indexDocuments(data, Object.keys(data[0]))
            setSearchResults(data)
        }
    }, [data])

    const handleSearch = (searchText: string) => {
        startTime = performance.now()

        setSearchText(searchText)
        setSearchWords(tokenize(searchText))
        debouncedSearch(searchText, data, setSearchResults, setSearchTime)
    }

    return (
        <>
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Paper className={classes.paper}>
                        <Typography variant="body2" color="textSecondary" align="right">{`Execution time ${Math.round(searchTime)}ms`}</Typography>
                        <TextField className={classes.searchTextField} label="Search" value={searchText} onChange={(e) => handleSearch(e.target.value)} />
                        <DataTable data={searchResults} searchWords={searchWords} />
                    </Paper>
                </Grid>
            </Grid>
        </>
    )
}

export default React.memo(Demo)
