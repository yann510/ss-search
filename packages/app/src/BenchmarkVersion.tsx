import Grid from "@material-ui/core/Grid"
import Paper from "@material-ui/core/Paper"
import React from "react"
import { makeStyles } from "@material-ui/core/styles"
import { BenchmarkResult } from "../../ss-search/benchmark/benchmark"
import axios from "axios"
import { LineChart, XAxis, YAxis, Tooltip, CartesianGrid, Line, ResponsiveContainer } from "recharts"

const useStyles = makeStyles((theme) => ({
    paper: {
        padding: theme.spacing(2),
        display: "flex",
        flexDirection: "column",
        height: 400,
    },
}))

function BenchmarkVersion() {
    const classes = useStyles()

    const [benchmarkResults, setBenchmarkResults] = React.useState<BenchmarkResult[]>([])

    React.useEffect(() => {
        async function fetchData() {
            const response = await axios.get<BenchmarkResult[]>("benchmarkResults.json")
            setBenchmarkResults(response.data)
        }
        fetchData()
    }, [])

    return (
        <>
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Paper className={classes.paper}>
                        <ResponsiveContainer width="99%">
                            <LineChart data={benchmarkResults}>
                                <Line dataKey="operationsPerSecond" type="monotone" stroke="blue" dot={false} />
                                <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
                                <XAxis dataKey="version" />
                                <YAxis tickFormatter={(value: number) => value.toLocaleString()} />
                                <Tooltip formatter={(value, name, entry) => [value.toLocaleString(), "Operations per second"]} />
                            </LineChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>
            </Grid>
        </>
    )
}

export default React.memo(BenchmarkVersion)
