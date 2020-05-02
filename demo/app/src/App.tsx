import React from "react"
import { makeStyles } from "@material-ui/core/styles"
import AppLayout from "./AppLayout"
import { Switch, Route, BrowserRouter } from "react-router-dom"
import Demo from "./Demo"
import CssBaseline from "@material-ui/core/CssBaseline"
import Container from "@material-ui/core/Container"

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
}))

function App() {
    const classes = useStyles()

    return (
        <div className={classes.root}>
            <CssBaseline />
            <BrowserRouter>
                <AppLayout />
                <main className={classes.content}>
                    <div className={classes.appBarSpacer} />
                    <Container maxWidth="lg" className={classes.container}>
                        <Switch>
                            <Route path="/">
                                <Demo />
                            </Route>
                            <Route path="/demo">
                                <Demo />
                            </Route>
                        </Switch>
                    </Container>
                </main>
            </BrowserRouter>
        </div>
    )
}

export default App
