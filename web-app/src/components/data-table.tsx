import { Data } from '../models/data'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import TableBody from '@mui/material/TableBody'
import Highlighter from 'react-highlight-words'
import TableFooter from '@mui/material/TableFooter'
import TablePagination from '@mui/material/TablePagination'
import Table from '@mui/material/Table'
import React, { ChangeEvent } from 'react'
import { SearchResultWithScore } from '@yann510/ss-search'

interface Props {
  data: Data[] | SearchResultWithScore<Data>[]
  searchWords: string[]
}

function DataTable(props: Props) {
  const { data, searchWords } = props

  const [page, setPage] = React.useState(0)
  const [rowsPerPage, setRowsPerPage] = React.useState(10)

  const handleChangePage = (_: unknown, newPage: number) => setPage(newPage)
  const handleChangeRowsPerPage = (event: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const target = event.target as HTMLInputElement
    setRowsPerPage(parseInt(target.value, 10))
    setPage(0)
  }

  const getDataKeys = (row: Data | SearchResultWithScore<Data>) => {
    if (row.element) {
      return Object.keys(row.element)
    }

    return Object.keys(row)
  }

  const getDataProperty = (row: Data | SearchResultWithScore<Data>, key: keyof Data) => {
    if (row.element) {
      return (row as SearchResultWithScore<Data>).element[key]
    }

    return (row as Data)[key]
  }

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>ID</TableCell>
          <TableCell>Name</TableCell>
          <TableCell>Age</TableCell>
          <TableCell>Address</TableCell>
          <TableCell>Score</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {data.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row) => {
          return (
            <TableRow key={getDataProperty(row, 'id')}>
              {getDataKeys(row).map((key) => (
                <TableCell key={key}>
                  <Highlighter searchWords={searchWords} textToHighlight={getDataProperty(row, key)?.toString()} />
                </TableCell>
              ))}
              <TableCell>{row?.score !== undefined ? row.score : 'N/A'}</TableCell>
            </TableRow>
          )
        })}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TablePagination
            style={{ border: 'none' }}
            count={data.length}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </TableRow>
      </TableFooter>
    </Table>
  )
}

export default React.memo(DataTable)
