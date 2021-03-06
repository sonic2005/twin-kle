import PropTypes from 'prop-types'
import React, {Component} from 'react'
import ProfilePanel from '../ProfilePanel'
import Body from './Body'
import ExecutionEnvironment from 'exenv'
import {connect} from 'react-redux'
import {checkValidUsername, unmountProfile} from 'redux/actions/UserActions'
import NotFound from 'components/NotFound'
import Loading from 'components/Loading'
import {browserHistory} from 'react-router'

class Profile extends Component {
  static propTypes = {
    checkValidUsername: PropTypes.func.isRequired,
    match: PropTypes.object.isRequired,
    profile: PropTypes.object.isRequired,
    userId: PropTypes.number,
    username: PropTypes.string
  }

  componentWillMount() {
    const {checkValidUsername, match} = this.props
    const {username} = match.params
    if (ExecutionEnvironment.canUseDOM) checkValidUsername(username)
  }

  componentDidUpdate(prevProps) {
    const {checkValidUsername, userId, profile: {unavailable}, match} = this.props
    if (prevProps.match.params.username !== match.params.username) {
      return checkValidUsername(match.params.username)
    }

    if (match.params.username === 'undefined' && !prevProps.userId && !!userId && !!unavailable) {
      browserHistory.push(`/${this.props.username}`)
    }
  }

  render() {
    const {profile: {unavailable, id}, userId} = this.props
    return !unavailable ? (
      <div style={{width: '100%'}}>
        {!id && <Loading text="Loading Profile..." />}
        {id &&
          <div style={{width: '100%'}}>
            <ProfilePanel {...this.props} />
            <Body {...this.props} />
          </div>
        }
      </div>
    ) : <NotFound title={!userId && 'For Registered Users Only'} text={!userId && 'Please Log In or Sign Up'} />
  }
}

export default connect(
  state => ({
    userId: state.UserReducer.userId,
    username: state.UserReducer.username,
    profilePicId: state.UserReducer.profilePicId,
    profile: state.UserReducer.profile
  }),
  {checkValidUsername, unmountProfile}
)(Profile)
