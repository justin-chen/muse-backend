import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import App from '../components/App';
import * as appActions from '../actions/appActions';
import * as loginActions from '../actions/loginActions';

const mapStateToProps = state => ({
    auth: state.auth,
});

const mapDispatchToProps = dispatch => ({
    ...bindActionCreators(appActions, dispatch),
    ...bindActionCreators(loginActions, dispatch),
});

const _App = connect(mapStateToProps, mapDispatchToProps)(App);

export default _App;