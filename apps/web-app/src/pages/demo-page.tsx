import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import React from 'react'
import { debounce } from 'lodash'
import { Data } from '../models/data'
import DataTable from '../components/data-table'
import { indexDocuments, search, tokenize } from '@yann510/ss-search'
import { makeStyles } from 'tss-react/mui'

let startTime = performance.now()

const debounceTime = 200
const debouncedSearch = debounce(
  (
    searchText: string,
    data: Data[],
    setSearchResults: React.Dispatch<React.SetStateAction<Data[]>>,
    setSearchTime: React.Dispatch<React.SetStateAction<number>>,
  ) => {
    const searchResults = search(data, Object.keys(data[0]), searchText)
    setSearchResults(searchResults)

    const endTime = performance.now()
    setSearchTime(endTime - (startTime + debounceTime))
  },
  debounceTime,
)

interface Props {
  data: Data[]
}

function DemoPage(props: Props) {
  const { data } = props

  const { classes } = useStyles()

  const [searchText, setSearchText] = React.useState('')
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
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Paper className={classes.paper}>
          <Typography variant="body2" color="textSecondary" align="right">{`Execution time ${Math.round(searchTime)}ms`}</Typography>
          <TextField className={classes.searchTextField} label="Search" value={searchText} onChange={(e) => handleSearch(e.target.value)} />
          <DataTable data={searchResults} searchWords={searchWords} />
        </Paper>
      </Grid>
    </Grid>
  )
}

export default React.memo(DemoPage)

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
}))
