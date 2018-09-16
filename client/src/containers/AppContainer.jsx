import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import App from '../components/App';
import * as appActions from '../actions/appActions';

const mapStateToProps = state => ({
    auth: state.auth,
});

const mapDispatchToProps = dispatch => ({
    ...bindActionCreators(appActions, dispatch),
});

const _App = connect(mapStateToProps, mapDispatchToProps)(App);

export default _App;