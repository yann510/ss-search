import React from "react"
import { makeStyles } from "@material-ui/core/styles"
import AppLayout from "./AppLayout"
import { Switch, Route, BrowserRouter } from "react-router-dom"
import Demo from "./Demo"
import CssBaseline from "@material-ui/core/CssBaseline"
import Container from "@material-ui/core/Container"
import { Backdrop, CircularProgress } from "@material-ui/core"
import axios from "axios"
import { flatten } from "lodash"
import { Data } from "./models/data"
import Benchmark from "./Benchmark"
import Typography from "@material-ui/core/Typography"
import Box from "@material-ui/core/Box"

const useStyles = makeStyles((theme) => ({
    root: {
        display: "flex",
        height: "100%",
    },
    appBarSpacer: theme.mixins.toolbar,
    content: {
        flexGrow: 1,
        height: "100vh",
        overflow: "auto",
    },
    container: {
        paddingTop: theme.spacing(4),
        paddingBottom: theme.spacing(4),
    },
    backdrop: {
        zIndex: theme.zIndex.drawer + 1,
        color: "#fff",
    },
    backdropContent: {
        display: "grid",
        gridTemplateRows: "50px 70px",
    },
    circularProgress: {
        placeSelf: "center",
    },
}))

function App() {
    const classes = useStyles()

    const [isLoading, setIsLoading] = React.useState(true)
    const [data, setData] = React.useState<Data[]>([])

    React.useEffect(() => {
        async function fetchData() {
            const responses = await Promise.all(Array.from(Array(10).keys()).map((x, i) => axios.get<Data[]>(`data-chunk-${i}.json`)))
            const data = flatten(responses.map((x) => x.data))

            setData(data)
            setIsLoading(false)
        }
        fetchData().catch((e) => console.error(e))
    }, [])

    return (
        <div className={classes.root}>
            <CssBaseline />
            <BrowserRouter>
                <Backdrop className={classes.backdrop} open={isLoading}>
                    <div className={classes.backdropContent}>
                        <CircularProgress className={classes.circularProgress} color="inherit" />
                        <span>Loading 10,000 entries...</span>
                    </div>
                </Backdrop>
                <AppLayout />
                <main className={classes.content}>
                    <div className={classes.appBarSpacer} />
                    <Container maxWidth="lg" className={classes.container}>
                        <Switch>
                            <Route exact path={["/", "/demo"]}>
                                <Demo data={data} />
                            </Route>
                            <Route exact path="/benchmark">
                                <Benchmark data={data} />
                            </Route>
                        </Switch>
                        <Box pt={4}>
                            <Typography variant="body2" color="textSecondary" align="center">
                                Stop searching, start finding.
                            </Typography>
                        </Box>
                    </Container>
                </main>
            </BrowserRouter>
        </div>
    )
}

export default App
