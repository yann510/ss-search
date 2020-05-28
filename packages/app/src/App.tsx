import React from "react"
import { makeStyles } from "@material-ui/core/styles"
import AppLayout, { drawerWidth } from "./AppLayout"
import { Switch, Route, BrowserRouter } from "react-router-dom"
import Demo from "./Demo"
import CssBaseline from "@material-ui/core/CssBaseline"
import Container from "@material-ui/core/Container"
import axios from "axios"
import { flatten } from "lodash"
import { Data } from "./models/data"
import Benchmark from "./Benchmark"
import Typography from "@material-ui/core/Typography"
import Box from "@material-ui/core/Box"
import BackdropProgress from "./BackdropLoader"
import clsx from 'clsx';
import BenchmarkVersion from './BenchmarkVersion';

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
        transition: theme.transitions.create("margin", {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
        }),
        marginLeft: -drawerWidth,
    },
    contentShift: {
        transition: theme.transitions.create("margin", {
            easing: theme.transitions.easing.easeOut,
            duration: theme.transitions.duration.enteringScreen,
        }),
        marginLeft: 0,
    },
    container: {
        paddingTop: theme.spacing(4),
        paddingBottom: theme.spacing(4),
    },
}))

function App() {
    const classes = useStyles()

    const [isLoading, setIsLoading] = React.useState(true)
    const [isDrawerOpen, setIsDrawerOpen] = React.useState(false)
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
                <BackdropProgress isLoading={isLoading} text="Loading 10,000 entries..." />
                <AppLayout onOpenChange={(open) => setIsDrawerOpen(open)} />
                <main className={clsx(classes.content, { [classes.contentShift]: isDrawerOpen })}>
                    <div className={classes.appBarSpacer} />
                    <Container maxWidth="lg" className={classes.container}>
                        <Switch>
                            <Route exact path={["/", "/demo"]}>
                                <Demo data={data} />
                            </Route>
                            <Route exact path="/benchmark">
                                <Benchmark data={data} />
                            </Route>
                            <Route exact path="/benchmark-version">
                                <BenchmarkVersion/>
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
