import PropTypes from 'prop-types'
import React, {Component} from 'react'
import Textarea from 'react-textarea-autosize'
import {Modal} from 'react-bootstrap'
import Button from 'components/Button'
import {
  closeAddPlaylistModal,
  uploadPlaylistAsync,
  getMoreVideosForModalAsync,
  searchVideos
} from 'redux/actions/PlaylistActions'
import {stringIsEmpty, addEmoji, finalizeEmoji} from 'helpers/stringHelpers'
import {connect} from 'react-redux'
import SortableThumb from './SortableThumb'
import {DragDropContext} from 'react-dnd'
import HTML5Backend from 'react-dnd-html5-backend'
import SelectVideosForm from './SelectVideosForm'

const defaultState = {
  section: 0,
  title: '',
  description: '',
  selectedVideos: [],
  titleError: false,
  searchText: ''
}

@DragDropContext(HTML5Backend)
@connect(
  state => ({
    videos: state.PlaylistReducer.videoThumbsForModal,
    searchedVideos: state.PlaylistReducer.searchedThumbs,
    loadMoreVideosButton: state.PlaylistReducer.loadMoreButtonForModal
  }),
  {
    closeAddPlaylistModal,
    uploadPlaylist: uploadPlaylistAsync,
    getMoreVideosForModal: getMoreVideosForModalAsync,
    searchVideos
  }
)
export default class AddPlaylistModal extends Component {
  static propTypes = {
    videos: PropTypes.array,
    loadMoreVideosButton: PropTypes.bool,
    getMoreVideosForModal: PropTypes.func,
    uploadPlaylist: PropTypes.func,
    closeAddPlaylistModal: PropTypes.func,
    searchVideos: PropTypes.func,
    searchedVideos: PropTypes.array
  }

  constructor() {
    super()
    this.state = defaultState
    this.handleHide = this.handleHide.bind(this)
    this.handlePrev = this.handlePrev.bind(this)
    this.handleNext = this.handleNext.bind(this)
    this.handleFinish = this.handleFinish.bind(this)
    this.onVideoSearch = this.onVideoSearch.bind(this)
  }

  render() {
    const {videos, loadMoreVideosButton, getMoreVideosForModal, searchedVideos} = this.props
    const {section, titleError, title, description, searchText} = this.state
    const last = array => {
      return array[array.length - 1]
    }
    const lastId = last(videos) ? last(videos).id : 0
    const loadMoreVideos = () => {
      getMoreVideosForModal(lastId)
    }
    return (
      <Modal
        show
        animation={false}
        backdrop="static"
        onHide={this.handleHide}
        dialogClassName={section >= 1 ? 'modal-extra-lg' : ''}
      >
        <Modal.Header closeButton>
          {this.renderTitle()}
        </Modal.Header>

        <Modal.Body>
          {section === 0 &&
            <form
              className="container-fluid"
              onSubmit={event => event.preventDefault()}
              onChange={() => this.setState({titleError: false})}
            >
              <fieldset className="form-group">
                <label>Playlist Title</label>
                <input
                  name="title"
                  placeholder="Enter Playlist Title"
                  className="form-control"
                  type="text"
                  value={title}
                  onChange={event => this.setState({title: event.target.value})}
                  onKeyUp={event => {
                    if (event.key === ' ') {
                      this.setState({title: addEmoji(event.target.value)})
                    }
                  }}
                />
                <span
                  className="help-block"
                  style={{color: 'red'}}
                >{titleError && 'Enter title'}</span>
              </fieldset>
              <fieldset className="form-group">
                <label>Description</label>
                <Textarea
                  name="description"
                  placeholder="Enter Description (Optional)"
                  className="form-control"
                  minRows={4}
                  value={description}
                  onChange={event => this.setState({description: event.target.value})}
                  onKeyUp={event => {
                    if (event.key === ' ') {
                      this.setState({description: addEmoji(event.target.value)})
                    }
                  }}
                />
              </fieldset>
            </form>
          }
          {section === 1 &&
            <div>
              <input
                className="form-control"
                placeholder="Search videos..."
                autoFocus
                style={{
                  marginBottom: '2em',
                  width: '50%'
                }}
                value={searchText}
                onChange={this.onVideoSearch}
              />
              <SelectVideosForm
                videos={searchText ? searchedVideos : videos}
                selectedVideos={this.state.selectedVideos}
                loadMoreVideosButton={searchText ? false : loadMoreVideosButton}
                onSelect={(selected, videoId) => this.setState({
                  selectedVideos: selected.concat([videoId])
                })}
                onDeselect={selected => this.setState({selectedVideos: selected})}
                loadMoreVideos={loadMoreVideos}
              />
            </div>
          }
          {section === 2 &&
            <div className="row">
              {this.state.selectedVideos.map(videoId => {
                let index = -1
                for (let i = 0; i < videos.length; i++) {
                  if (videos[i].id === videoId) {
                    index = i
                    break
                  }
                }
                return (
                  <SortableThumb
                    key={videos[index].id}
                    video={videos[index]}
                    onMove={({sourceId, targetId}) => {
                      const selectedVideoArray = this.state.selectedVideos
                      const sourceIndex = selectedVideoArray.indexOf(sourceId)
                      const targetIndex = selectedVideoArray.indexOf(targetId)
                      selectedVideoArray.splice(sourceIndex, 1)
                      selectedVideoArray.splice(targetIndex, 0, sourceId)
                      this.setState({
                        selectedVideos: selectedVideoArray
                      })
                    }}
                  />
                )
              })}
            </div>
          }
        </Modal.Body>

        <Modal.Footer>
          {section === 0 ?
            <Button className="btn btn-default" onClick={this.handleHide}>Cancel</Button>
            :
            <Button className="btn btn-default" onClick={this.handlePrev}>Prev</Button>
          }
          {section === 2 ?
            <Button className="btn btn-primary" onClick={this.handleFinish}>Finish</Button>
            :
            <Button
              className="btn btn-primary"
              type="submit"
              disabled={section === 1 && this.state.selectedVideos.length < 2}
              onClick={this.handleNext}
            >Next</Button>
          }
        </Modal.Footer>
      </Modal>
    )
  }

  renderTitle() {
    const currentSection = this.state.section
    switch (currentSection) {
      case 0:
        return <h4>Add Playlist</h4>
      case 1:
        return <h4>Add videos to your playlist</h4>
      case 2:
        return <h4>Click and drag videos into the order that you would like them to appear</h4>
      default:
        return <h4>TBD</h4>
    }
  }

  handlePrev() {
    const currentSection = this.state.section
    const prevSection = Math.max(currentSection - 1, 0)
    this.setState({section: prevSection})
  }

  handleNext() {
    const currentSection = this.state.section
    const {title} = this.state
    if (currentSection === 0 && stringIsEmpty(title)) return this.setState({titleError: true})
    const nextSection = Math.min(currentSection + 1, 2)
    this.setState({section: nextSection})
  }

  handleFinish() {
    const {uploadPlaylist} = this.props
    const {title, description, selectedVideos} = this.state
    uploadPlaylist({title: finalizeEmoji(title), description: finalizeEmoji(description), selectedVideos})
  }

  handleHide() {
    const {closeAddPlaylistModal} = this.props
    this.setState(defaultState)
    closeAddPlaylistModal()
  }

  onVideoSearch(event) {
    const {searchVideos} = this.props
    this.setState({searchText: event.target.value})
    searchVideos(event.target.value)
  }
}
