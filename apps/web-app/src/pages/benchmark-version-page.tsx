import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import React from 'react'
import axios from 'axios'
import { LineChart, XAxis, YAxis, Tooltip, CartesianGrid, Line, ResponsiveContainer } from 'recharts'
import { makeStyles } from 'tss-react/mui'
import { round } from 'lodash'

enum OperationType {
  Search,
}
export interface BenchmarkResult {
  version: string
  operationType: OperationType
  operationsPerSecond: number
  runsSampled: number
}

function BenchmarkVersionPage() {
  const { classes } = useStyles()
  const [benchmarkResults, setBenchmarkResults] = React.useState<BenchmarkResult[]>([])
  const maxAbsValue = Math.max(...benchmarkResults.map((result) => Math.abs(result.operationsPerSecond)))
  const minAbsValue = Math.min(...benchmarkResults.map((result) => Math.abs(result.operationsPerSecond)))
  const maxPadding = maxAbsValue * 0.02
  const minPadding = minAbsValue * 0.02
  const paddedMaxAbsValue = maxAbsValue + maxPadding
  const paddedMinAbsValue = minAbsValue - minPadding

  React.useEffect(() => {
    async function fetchData() {
      const response = await axios.get<BenchmarkResult[]>('assets/benchmarkResults.json')
      setBenchmarkResults(response.data)
    }
    fetchData().catch(console.error)
  }, [])

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Paper className={classes.paper}>
          <ResponsiveContainer width="99%">
            <LineChart data={benchmarkResults}>
              <Line dataKey="operationsPerSecond" type="monotone" stroke="blue" dot={false} />
              <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
              <XAxis dataKey="version" />
              <YAxis domain={[paddedMinAbsValue, paddedMaxAbsValue]} tickFormatter={(value: number) => round(value).toLocaleString()} />
              <Tooltip formatter={(value) => [value.toLocaleString(), 'Operations per second']} />
            </LineChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>
    </Grid>
  )
}

export default React.memo(BenchmarkVersionPage)

const useStyles = makeStyles()((theme) => ({
  paper: {
    padding: theme.spacing(2),
    display: 'flex',
    flexDirection: 'column',
    height: 400,
  },
}))
