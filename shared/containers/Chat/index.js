import React, {Component} from 'react';
import ReactDOM from 'react-dom';
import MessagesContainer from './MessagesContainer';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import * as ChatActions from 'redux/actions/ChatActions';
import ChatInput from './ChatInput';
import CreateNewChannelModal from './Modals/CreateNewChannel';
import InviteUsersModal from './Modals/InviteUsers';
import UserListModal from 'components/Modals/UserListModal';
import {cleanStringWithURL} from 'helpers/StringHelper';
import SmallDropdownButton from 'components/SmallDropdownButton';

@connect(
  state => ({
    userId: state.UserReducer.userId,
    username: state.UserReducer.username,
    currentChannel: state.ChatReducer.currentChannel,
    channels: state.ChatReducer.channels,
    messages: state.ChatReducer.messages,
    loadMoreButton: state.ChatReducer.loadMoreButton,
    chatPartnerId: state.ChatReducer.chatPartnerId
  }),
  {
    receiveMessage: ChatActions.receiveMessage,
    receiveMessageOnDifferentChannel: ChatActions.receiveMessageOnDifferentChannel,
    receiveFirstMsg: ChatActions.receiveFirstMsg,
    enterChannel: ChatActions.enterChannelAsync,
    enterEmptyBidirectionalChat: ChatActions.enterEmptyBidirectionalChat,
    submitMessage: ChatActions.submitMessageAsync,
    loadMoreMessages: ChatActions.loadMoreMessagesAsync,
    createNewChannel: ChatActions.createNewChannelAsync,
    createBidirectionalChannel: ChatActions.createBidirectionalChannelAsync,
    checkChannelExists: ChatActions.checkChannelExistsAsync
  }
)
export default class Chat extends Component {
  constructor(props) {
    super(props)
    this.state = {
      currentChannelOnline: 1,
      createNewChannelModalShown: false,
      inviteUsersModalShown: false,
      userListModalShown: false,
      membersOnline: []
    }

    this.onCreateNewChannel = this.onCreateNewChannel.bind(this)
    this.onNewButtonClick = this.onNewButtonClick.bind(this)
    this.onMessageSubmit = this.onMessageSubmit.bind(this)
    this.onReceiveMessage = this.onReceiveMessage.bind(this)
    this.onChatInvitation = this.onChatInvitation.bind(this)

    const {socket} = props;
    socket.on('RECEIVE_MESSAGE', this.onReceiveMessage)
    socket.on('CHAT_INVITATION', this.onChatInvitation)
    socket.on('CHANGE_IN_MEMBERS_ONLINE', data => {
      let {membersOnline} = this.state;
      let forCurrentChannel = Number(data.channelId) === Number(this.props.currentChannel.id);
      if (forCurrentChannel) {
        this.setState({currentChannelOnline: data.members.length})
      }
      let channelObjectExists = false;
      for (let i = 0; i < membersOnline.length; i++) {
        if (Number(membersOnline[i].channelId) === Number(data.channelId)) {
          channelObjectExists = true;
          break;
        }
      }
      if (channelObjectExists) {
        this.setState({
          membersOnline: membersOnline.map(elem => {
            if (Number(elem.channelId) === Number(data.channelId)) {
              elem.members = data.members
            }
            return elem;
          })
        })
      } else {
        this.setState({
          membersOnline: membersOnline.concat([data])
        })
      }
    })
  }

  componentWillMount() {
    const {socket, channels} = this.props;
    for (let i = 0; i < channels.length; i ++) {
      let channelId = channels[i].id;
      socket.emit('CHECK_ONLINE_MEMBERS', channelId, (err, data) => {
        let {membersOnline} = this.state;
        let forCurrentChannel = Number(data.channelId) === Number(this.props.currentChannel.id);
        if (forCurrentChannel) {
          this.setState({currentChannelOnline: data.members.length})
        }
        let channelObjectExists = false;
        for (let i = 0; i < membersOnline.length; i++) {
          if (Number(membersOnline[i].channelId) === Number(data.channelId)) {
            channelObjectExists = true;
            break;
          }
        }
        if (channelObjectExists) {
          this.setState({
            membersOnline: membersOnline.map(elem => {
              if (Number(elem.channelId) === Number(data.channelId)) {
                elem.members = data.members
              }
              return elem;
            })
          })
        } else {
          this.setState({
            membersOnline: membersOnline.concat([data])
          })
        }
      });
    }
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.currentChannel.id !== this.props.currentChannel.id) {
      ReactDOM.findDOMNode(this.refs.chatInput).focus()
    }
  }

  componentWillUnmount() {
    const {socket, channels, onUnmount} = this.props;
    socket.removeListener('RECEIVE_MESSAGE', this.onReceiveMessage);
    socket.removeListener('CHAT_INVITATION', this.onChatInvitation);
    socket.removeListener('CHANGE_IN_MEMBERS_ONLINE');
    onUnmount();
  }

  render() {
    const {channels, currentChannel, userId} = this.props;
    const {createNewChannelModalShown, inviteUsersModalShown, userListModalShown, membersOnline} = this.state;
    const channelName = () => {
      for (let i = 0; i < channels.length; i ++) {
        if (Number(channels[i].id) === Number(currentChannel.id)) {
          return channels[i].roomname
        }
      }
      return null;
    }

    let menuProps = [];
    if (!currentChannel.bidirectional) {
      menuProps.push({
        label: 'Invite People',
        onClick: () => this.setState({inviteUsersModalShown: true})
      })
    }

    if ((Number(currentChannel.creatorId) === Number(userId)) && !currentChannel.bidirectional) {
      menuProps.push({
        label: 'Edit Title',
        onClick: () => console.log("edit channel title")
      })
    }

    if (menuProps.length > 0) {
      menuProps.push({
        separator: true
      })
    }

    menuProps.push({
      label: `Leave ${currentChannel.bidirectional ? 'Chat' : 'Channel'}`,
      onClick: () => console.log("leave channel")
    })

    return (
      <div style={{display: 'flex', height: '88%'}}>
        {createNewChannelModalShown &&
          <CreateNewChannelModal
            show
            userId={userId}
            onHide={() => this.setState({createNewChannelModalShown: false})}
            onDone={this.onCreateNewChannel}
          />
        }
        {inviteUsersModalShown &&
          <InviteUsersModal
            show
            onHide={() => this.setState({inviteUsersModalShown: false})}
            currentMembers={currentChannel.members}
          />
        }
        {userListModalShown &&
          <UserListModal
            show
            onHide={() => this.setState({userListModalShown: false})}
            users={currentChannel.members.map(member => ({username: member.username, userId: member.userid}))}
            userId={userId}
          />
        }
        <div
          className="col-xs-3"
          style={{
            border: '1px solid #eee',
            marginLeft: '0.5em',
            paddingTop: '0.5em'
          }}
        >
          <div
            className="flexbox-container"
            style={{
              marginBottom: '1em',
              paddingBottom: '0.5em',
              borderBottom: '1px solid #eee'
            }}
          >
            <div className="text-center col-xs-8 col-xs-offset-2">
              <h4
                style={{
                  whiteSpace: 'nowrap',
                  textOverflow:'ellipsis',
                  overflow:'hidden',
                  lineHeight: 'normal',
                  marginBottom: '0px'
                }}
              >{channelName()}</h4>
              <small>
                <a
                  style={{
                    cursor: 'pointer'
                  }}
                  onClick={() => this.setState({userListModalShown: true})}
                >{this.renderNumberOfMembers()}</a> online</small>
            </div>
            <button
              className="btn btn-default btn-sm pull-right"
              onClick={this.onNewButtonClick}
            >+New</button>
          </div>
          {
            /*<div className="row container-fluid">
              <input
                className="form-control"
                placeholder="Search for channels / usernames"
              />
            </div>*/
          }
          <div
            className="row"
            style={{
              marginTop: '1em',
              overflow: 'scroll',
              position: 'absolute',
              height: '80%',
              width: '100%'
            }}
          >
            {this.renderChannels()}
          </div>
        </div>
        <div
          className="col-xs-9 pull-right"
          style={{
            height: '100%',
            width: '73%',
            top: 0
          }}
        >
          <SmallDropdownButton
            style={{
              position: "absolute",
              zIndex: 100,
              top: "0px",
              right: "0px"
            }}
            shape="button"
            menuProps={menuProps}
          />
          <MessagesContainer
            ref="messagesContainer"
            currentChannelId={this.props.currentChannel.id}
            loadMoreButton={this.props.loadMoreButton}
            messages={this.props.messages}
            userId={this.props.userId}
            loadMoreMessages={this.props.loadMoreMessages}
          />
          <div
            style={{
              position: 'absolute',
              width: '95%',
              bottom: '10px'
            }}
          >
            <ChatInput
              ref="chatInput"
              onMessageSubmit={this.onMessageSubmit}
            />
          </div>
        </div>
      </div>
    )
  }

  renderChannels() {
    const {userId, currentChannel, channels} = this.props;
    return channels.map(channel => {
      const {lastMessageSender, lastMessage, id, roomname, numUnreads} = channel;
      return (
        <div
          className="media chat-channel-item container-fluid"
          style={{
            width: '100%',
            backgroundColor: id == currentChannel.id && '#f7f7f7',
            cursor: 'pointer',
            padding: '1em',
            marginTop: '0px'
          }}
          onClick={() => this.onChannelEnter(id)}
          key={id}
        >
          <div className="media-body">
            <h4 className="media-heading">{roomname} {numUnreads > 0 &&
              <span className="badge">{numUnreads}</span>
            }</h4>
            <small
              style={{
                whiteSpace: 'nowrap',
                textOverflow:'ellipsis',
                overflow:'hidden',
                width: '25em',
                display: 'block'
              }}
            >
              <span style={{
                overflow:'hidden',
                lineHeight: 'normal',
                whiteSpace: 'nowrap'
              }}>
                {lastMessageSender && lastMessage ?
                  `${lastMessageSender.id == userId ? 'You' : lastMessageSender.username}: ${cleanStringWithURL(lastMessage)}` : '\u00a0'
                }
              </span>
            </small>
          </div>
        </div>
      )
    })
  }

  renderNumberOfMembers() {
    const {currentChannel} = this.props;
    const {currentChannelOnline} = this.state;
    const numberOfMembers = currentChannel.members.length;
    return `${currentChannelOnline}${numberOfMembers === 0 ? '' : '/' + numberOfMembers}`
  }

  onMessageSubmit(message) {
    const {
      socket,
      submitMessage,
      userId,
      username,
      currentChannel,
      createBidirectionalChannel,
      chatPartnerId
    } = this.props;

    if (currentChannel.id === 0) {
      return createBidirectionalChannel({message, userId, chatPartnerId}, chat => {
        if (chat.alreadyExists) {
          let {message, messageId} = chat.alreadyExists;
          socket.emit('JOIN_CHAT_CHANNEL', message.roomid);
          socket.emit('NEW_CHAT_MESSAGE', {
            userid: userId,
            username,
            content: message.content,
            channelId: message.roomid,
            id: messageId,
            timeposted: message.timeposted
          })
          return;
        }
        socket.emit('JOIN_CHAT_CHANNEL', String(chat.roomid));
        socket.emit('SEND_BI_CHAT_INVITATION', chatPartnerId, chat);
      })
    }

    let params = {
      userid: userId,
      username,
      content: message,
      channelId: currentChannel.id
    }
    submitMessage(params, message => {
      socket.emit('NEW_CHAT_MESSAGE', message);
    })
  }

  onNewButtonClick() {
    this.setState({createNewChannelModalShown: true})
  }

  onChannelEnter(id) {
    const {enterChannel, enterEmptyBidirectionalChat} = this.props;
    const {membersOnline} = this.state;
    if (id === 0) {
      this.setState({currentChannelOnline: 1})
      return enterEmptyBidirectionalChat()
    }
    let currentChannelOnline = 1;
    for (let i = 0; i < membersOnline.length; i++) {
      if (Number(membersOnline[i].channelId) === Number(id)) {
        currentChannelOnline = membersOnline[i].members.length;
      }
    }
    enterChannel(id, () => this.setState({currentChannelOnline}))
  }

  onCreateNewChannel(params) {
    const {checkChannelExists, createNewChannel, socket, username, userId} = this.props;
    if (params.selectedUsers.length === 1) {
      const partner = params.selectedUsers[0];
      return checkChannelExists({username, userId}, partner, () => {
        this.setState({createNewChannelModalShown: false})
      })
    }

    createNewChannel(params, data => {
      const users = params.selectedUsers.map(user => {
        return user.userId;
      })
      socket.emit('JOIN_CHAT_CHANNEL', data.message.roomid);
      socket.emit('SEND_GROUP_CHAT_INVITATION', users, data);
      this.setState({createNewChannelModalShown: false})
      ReactDOM.findDOMNode(this.refs.chatInput).focus()
    })
  }

  onReceiveMessage(data) {
    const {receiveMessage, receiveMessageOnDifferentChannel, currentChannel, userId} = this.props;
    let messageIsForCurrentChannel = Number(data.channelId) === Number(currentChannel.id);
    let senderIsNotTheUser = Number(data.userid) !== Number(userId);
    if (messageIsForCurrentChannel && senderIsNotTheUser) {
      receiveMessage(data)
    }
    if (!messageIsForCurrentChannel) {
      console.log(currentChannel.id)
      receiveMessageOnDifferentChannel(data)
    }
  }

  onChatInvitation(data) {
    const {receiveFirstMsg, socket} = this.props;
    receiveFirstMsg(data);
    socket.emit('JOIN_CHAT_CHANNEL', data.roomid);
  }
}
