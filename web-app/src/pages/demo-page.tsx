import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import React, { useEffect } from 'react'
import { debounce } from 'lodash'
import { Data } from '../models/data'
import DataTable from '../components/data-table'
import { makeStyles } from 'tss-react/mui'
import { indexDocuments, search, SearchResultWithScore, tokenize } from '@yann510/ss-search'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'

let startTime = performance.now()

const debounceTime = 200
const debouncedSearch = debounce(
  (
    searchText: string,
    data: Data[],
    setSearchResults: React.Dispatch<React.SetStateAction<Data[] | SearchResultWithScore<Data>[]>>,
    setSearchTime: React.Dispatch<React.SetStateAction<number>>,
    withScore: boolean,
  ) => {
    const searchResults = search(data, Object.keys(data[0]), searchText, { withScore })
    if (typeof searchResults[0]?.score === 'number') {
      const filteredAndSortedResults = (searchResults as SearchResultWithScore<Data>[]).sort((a, b) => b.score - a.score)
      setSearchResults(filteredAndSortedResults)
    } else {
      setSearchResults(searchResults)
    }

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
  const [searchResults, setSearchResults] = React.useState<Data[] | SearchResultWithScore<Data>[]>(data)
  const [searchWords, setSearchWords] = React.useState<string[]>([])
  const [searchTime, setSearchTime] = React.useState(0)
  const [withScore, setWithScore] = React.useState(true)

  React.useEffect(() => {
    if (data && data.length > 0) {
      indexDocuments(data, Object.keys(data[0]), null)
      setSearchResults(data)
    }
  }, [data])

  useEffect(() => {
    if (data) {
      handleSearch(searchText)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  const handleSearch = (searchText: string, withScoreOverride?: boolean) => {
    startTime = performance.now()

    setSearchText(searchText)
    setSearchWords(tokenize(searchText))
    debouncedSearch(searchText, data, setSearchResults, setSearchTime, withScoreOverride ?? withScore)
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Paper className={classes.paper}>
          <Typography variant="body2" color="textSecondary" align="right">{`Execution time ${Math.round(searchTime)}ms`}</Typography>
          <TextField
            className={classes.searchTextField}
            label="Search"
            value={searchText}
            onChange={(e) => handleSearch((e.target as HTMLInputElement).value)}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={withScore}
                onChange={(e) => {
                  const checked = (e.target as HTMLInputElement).checked
                  setWithScore(checked)
                  handleSearch(searchText, checked)
                }}
                name="withScoreOption"
                color="primary"
              />
            }
            label="With Score"
          />
          <DataTable data={searchResults} searchWords={searchWords} />
        </Paper>
      </Box>
    </Stack>
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
