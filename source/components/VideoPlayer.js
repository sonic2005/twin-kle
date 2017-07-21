import PropTypes from 'prop-types'
import React, {Component} from 'react'
import YouTube from 'react-youtube'
import Loading from 'components/Loading'
import {Color} from 'constants/css'
import {connect} from 'react-redux'
import {addVideoViewAsync} from 'redux/actions/VideoActions'
import request from 'axios'
import {URL} from 'constants/URL'

const API_URL = `${URL}/content`

class VideoPlayer extends Component {
  static propTypes = {
    addVideoView: PropTypes.func.isRequired,
    autoplay: PropTypes.bool,
    className: PropTypes.string,
    containerClassName: PropTypes.string,
    onEdit: PropTypes.bool,
    small: PropTypes.bool,
    style: PropTypes.object,
    title: PropTypes.string.isRequired,
    userId: PropTypes.number,
    videoCode: PropTypes.string.isRequired,
    videoId: PropTypes.number.isRequired
  }

  constructor(props) {
    super()
    this.state = {
      playing: props.autoplay,
      imageUrl: `https://img.youtube.com/vi/${props.videoCode}/mqdefault.jpg`
    }
    this.onVideoReady = this.onVideoReady.bind(this)
  }

  componentDidMount() {
    const {videoCode} = this.props
    return request.get(`${API_URL}/videoThumb?videoCode=${videoCode}`).then(
      ({data: {payload}}) => {
        if (payload) this.setState({imageUrl: payload})
      }
    ).catch(
      error => console.error(error)
    )
  }

  componentDidUpdate(prevProps) {
    const {onEdit} = this.props
    if (prevProps.onEdit !== onEdit) {
      this.setState({playing: !onEdit})
    }
  }

  render() {
    const {videoCode, title, containerClassName, className, style, small} = this.props
    const {imageUrl, playing} = this.state
    return (
      <div
        className={small ? containerClassName : `video-player ${containerClassName}`}
        style={{...style, cursor: !playing && 'pointer'}}
        onClick={() => {
          if (!playing) {
            this.setState({playing: true})
          }
        }}
      >
        {!small && !playing && <div>
          <img
            alt=""
            className="embed-responsive-item"
            src={imageUrl}
          />
        </div>}
        {playing && !small ?
          <Loading
            style={{
              color: Color.blue,
              fontSize: '3em',
              position: 'absolute',
              display: 'block',
              height: '40px',
              width: '40px',
              top: '50%',
              left: '50%',
              margin: '-20px 0 0 -20px'
            }}
          /> : <a></a>
        }
        {playing &&
          <YouTube
            className={className}
            opts={{title}}
            videoId={videoCode}
            onReady={this.onVideoReady}
          />
        }
      </div>
    )
  }

  onVideoReady(event) {
    const {videoId, userId, addVideoView} = this.props
    event.target.playVideo()
    const time = event.target.getCurrentTime()
    if (Math.floor(time) === 0) {
      addVideoView({videoId, userId})
    }
  }
}

export default connect(
  state => ({
    userId: state.UserReducer.userId
  }),
  {addVideoView: addVideoViewAsync}
)(VideoPlayer)
