import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { timeSince } from 'helpers/TimeStampHelper';
import { cleanStringWithURL } from 'helpers/StringHelper';
import SmallDropdownButton from 'components/SmallDropdownButton';
import Likers from 'components/Likers';
import UserListModal from 'components/Modals/UserListModal';
import ReplyInputArea from './Replies/ReplyInputArea';
import Replies from './Replies';
import EditTextArea from './EditTextArea';


export default class Comment extends Component {
  state = {
    replyInputShown: false,
    onEdit: false,
    userListModalShown: false
  }
  render() {
    const { replyInputShown, onEdit, userListModalShown } = this.state;
    const { comment, userId } = this.props;
    const userIsOwner = comment.posterId == userId;
    let userLikedThis = false;
    for (let i = 0; i < comment.likes.length; i++) {
      if (comment.likes[i].userId == userId) userLikedThis = true;
    }
    return (
      <li
        className="media"
        style={{marginTop: this.props.marginTop && '2em'}}
      >
        { userIsOwner && !onEdit &&
          <SmallDropdownButton
            rightMargin='3em'
            menuProps={[
              {
                label: "Edit",
                onClick: () => this.setState({onEdit: true})
              },
              {
                label: "Remove",
                onClick: this.onDelete.bind(this)
              }
            ]}
          />
        }
        <div className="media-left">
          <a>
            <img
              className="media-object"
              src="/img/default.jpg"
              style={{width: '64px'}}
            />
          </a>
        </div>
        <div className="media-body">
          <h4 className="media-heading">
            { comment.posterName } <small>&nbsp;{ timeSince(comment.timeStamp) }</small>
          </h4>
          { onEdit ?
            <EditTextArea
              text={cleanStringWithURL(comment.content)}
              onCancel={() => this.setState({onEdit: false})}
              onEditDone={this.onEditDone.bind(this)}
            /> :
            <div className="container-fluid">
              <div
                className="row"
                style={{paddingBottom: '1.7em'}}
                dangerouslySetInnerHTML={{__html: comment.content}}
              ></div>
              <div
                className="row flexbox-container"
              >
                <div className="pull-left">
                  <button
                    className="btn btn-warning btn-sm"
                    onClick={ () => this.setState({replyInputShown: true}) }
                  >
                    <span className="glyphicon glyphicon-comment"></span> Reply
                  </button>
                  <button
                    className="btn btn-info btn-sm"
                    style={{marginLeft: '0.5em'}}
                    onClick={this.onLikeClick.bind(this)}
                  >
                    <span className="glyphicon glyphicon-thumbs-up"></span> {`${userLikedThis ? 'Liked!' : 'Like'}`}
                  </button>
                </div>
                <small>
                  <Likers
                    className="pull-left"
                    style={{
                      marginLeft: '0.8em',
                      color: '#f0ad4e',
                      marginTop: '1em'
                    }}
                    userId={userId}
                    likes={comment.likes}
                    onLinkClick={() => this.setState({userListModalShown: true})}
                  />
                </small>
              </div>
            </div>
          }
          <Replies
            userId={userId}
            replies={comment.replies}
            onEditDone={
              ({replyId, editedReply}, cb) =>
              this.props.onReplyEditDone({
                replyId,
                editedReply,
                commentId: this.props.commentId
              }, cb)
            }
            onLikeClick={ replyId => this.props.onReplyLike(replyId, this.props.commentId) }
            onDelete={ replyId => this.props.onReplyDelete(replyId, this.props.commentId) }
          />
          { replyInputShown && <ReplyInputArea
              onSubmit={this.onReplySubmit.bind(this)}
            />
          }
        </div>
        { userListModalShown &&
          <UserListModal
            show={true}
            onHide={ () => this.setState({userListModalShown: false}) }
            title="People who liked this comment"
            userId={userId}
            likers={comment.likes}
          />
        }
      </li>
    )
  }

  onEditDone(editedComment) {
    const { commentId } = this.props;
    this.props.onEditDone(editedComment, commentId, () => {
      this.setState({onEdit: false})
    })
  }

  onLikeClick() {
    const { commentId } = this.props;
    this.props.onLikeClick(commentId);
  }

  onReplySubmit(reply) {
    const { commentId, videoId } = this.props;
    this.props.onReplySubmit(reply, commentId, videoId);
  }

  onDelete() {
    const { commentId } = this.props;
    this.props.onDelete(commentId);
  }
}