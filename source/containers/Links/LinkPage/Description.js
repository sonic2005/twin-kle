import PropTypes from 'prop-types'
import React, {Component} from 'react'
import UsernameText from 'components/Texts/UsernameText'
import DropdownButton from 'components/DropdownButton'
import {timeSince} from 'helpers/timeStampHelpers'
import LongText from 'components/Texts/LongText'
import Button from 'components/Button'
import Textarea from 'react-textarea-autosize'
import Input from 'components/Texts/Input'
import {
  cleanString, isValidUrl, stringIsEmpty, addEmoji, finalizeEmoji
} from 'helpers/stringHelpers'

export default class Description extends Component {
  static propTypes = {
    description: PropTypes.string,
    linkId: PropTypes.number.isRequired,
    myId: PropTypes.number,
    onDelete: PropTypes.func.isRequired,
    onEditDone: PropTypes.func.isRequired,
    timeStamp: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number
    ]).isRequired,
    title: PropTypes.string.isRequired,
    uploaderId: PropTypes.number,
    uploaderName: PropTypes.string,
    url: PropTypes.string.isRequired
  }

  constructor(props) {
    super()
    this.state = {
      editedUrl: props.url,
      editedTitle: cleanString(props.title),
      editedDescription: props.description,
      onEdit: false,
      editDoneButtonDisabled: true
    }
    this.determineEditButtonDoneStatus = this.determineEditButtonDoneStatus.bind(this)
    this.onEditCancel = this.onEditCancel.bind(this)
    this.onEditFinish = this.onEditFinish.bind(this)
  }
  render() {
    const {uploaderId, myId, title, description, uploaderName, timeStamp, onDelete} = this.props
    const {
      onEdit,
      editedTitle,
      editedDescription,
      editDoneButtonDisabled,
      editedUrl
    } = this.state
    return (
      <div>
        {uploaderId === myId && !onEdit &&
          <DropdownButton
            style={{
              top: '1em',
              right: '1em',
              position: 'absolute'
            }}
            shape="button" icon="pencil"
            menuProps={[
              {
                label: 'Edit',
                onClick: () => this.setState({onEdit: true})
              },
              {
                label: 'Delete',
                onClick: () => onDelete()
              }
            ]}
          />
        }
        <div className="row page-header text-center" style={{marginTop: '2.5rem'}}>
          <div>
            {onEdit ?
              <form className="col-sm-6 col-sm-offset-3" onSubmit={event => event.preventDefault()}>
                <Input
                  type="text"
                  className="form-control"
                  placeholder="Enter Title..."
                  value={editedTitle}
                  onChange={text => {
                    this.setState({editedTitle: text}, () => {
                      this.determineEditButtonDoneStatus()
                    })
                  }}
                  onKeyUp={event => {
                    if (event.key === ' ') {
                      this.setState({editedTitle: addEmoji(event.target.value)})
                    }
                  }}
                />
              </form> :
              <h2>{title}</h2>
            }
          </div>
          <div>
            <small className="col-xs-12" style={{paddingTop: onEdit && '1em'}}>
              Added by <UsernameText user={{id: uploaderId, name: uploaderName}} /> ({timeSince(timeStamp)})
            </small>
          </div>
        </div>
        <div
          style={{
            fontSize: '1.7rem',
            lineHeight: '3rem',
            wordBreak: 'break-word'
          }}
        >
          {onEdit ?
            <div>
              <form>
                <Input
                  className="form-control"
                  placeholder="Enter URL"
                  style={{marginBottom: '1em'}}
                  value={editedUrl}
                  onChange={text => {
                    this.setState({editedUrl: text}, () => {
                      this.determineEditButtonDoneStatus()
                    })
                  }}
                />
                <Textarea
                  minRows={4}
                  className="form-control"
                  placeholder="Enter Description"
                  value={editedDescription}
                  onChange={event => {
                    this.determineEditButtonDoneStatus()
                    this.setState({editedDescription: event.target.value}, () => {
                      this.determineEditButtonDoneStatus()
                    })
                  }}
                  onKeyUp={event => {
                    if (event.key === ' ') {
                      this.setState({editedDescription: addEmoji(event.target.value)})
                    }
                  }}
                />
              </form>
              <div
                className="row container-fluid text-center"
                style={{
                  marginTop: '1em'
                }}
              >
                <Button
                  className="btn btn-default btn-sm"
                  disabled={editDoneButtonDisabled}
                  onClick={this.onEditFinish}
                >Done</Button>
                <Button
                  className="btn btn-default btn-sm"
                  style={{marginLeft: '5px'}}
                  onClick={this.onEditCancel}
                >Cancel</Button>
              </div>
            </div> :
            <LongText lines={20}>{description || ''}</LongText>
          }
        </div>
      </div>
    )
  }

  determineEditButtonDoneStatus() {
    const urlIsEmpty = stringIsEmpty(this.state.editedUrl)
    const urlIsValid = isValidUrl(this.state.editedUrl)
    const titleIsEmpty = stringIsEmpty(this.state.editedTitle)
    const titleChanged = this.state.editedTitle !== this.props.title
    const urlChanged = this.state.editedUrl !== this.props.url
    const descriptionChanged = this.state.editedDescription !== this.props.description
    const editDoneButtonDisabled =
      !urlIsValid || urlIsEmpty || titleIsEmpty || (!titleChanged && !descriptionChanged && !urlChanged)
    this.setState({editDoneButtonDisabled})
  }

  onEditCancel() {
    const {description, title, url} = this.props
    this.setState({
      editedUrl: url,
      editedTitle: cleanString(title),
      editedDescription: description,
      onEdit: false,
      editDoneButtonDisabled: true
    })
  }

  onEditFinish() {
    const {onEditDone, linkId} = this.props
    const {editedTitle, editedDescription, editedUrl} = this.state
    return onEditDone({
      editedUrl,
      editedTitle: finalizeEmoji(editedTitle),
      editedDescription: finalizeEmoji(editedDescription),
      linkId
    }).then(
      () => this.setState({onEdit: false})
    )
  }
}
