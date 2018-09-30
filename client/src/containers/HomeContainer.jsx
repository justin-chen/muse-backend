import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import Home from '../components/Home';
import * as loginActions from '../actions/loginActions';

const mapStateToProps = state => ({
    auth: state.auth,
});

const mapDispatchToProps = dispatch => ({
    ...bindActionCreators(loginActions, dispatch),
});

const _Home = connect(mapStateToProps, mapDispatchToProps)(Home);

export default _Home;