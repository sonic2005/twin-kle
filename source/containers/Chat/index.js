import PropTypes from 'prop-types'
import React, {Component} from 'react'
import MessagesContainer from './MessagesContainer'
import {connect} from 'react-redux'
import * as ChatActions from 'redux/actions/ChatActions'
import ChatInput from './ChatInput'
import CreateNewChannelModal from './Modals/CreateNewChannel'
import InviteUsersModal from './Modals/InviteUsers'
import EditTitleModal from './Modals/EditTitle'
import UserListModal from 'components/Modals/UserListModal'
import {cleanString} from 'helpers/stringHelpers'
import DropdownButton from 'components/DropdownButton'
import Button from 'components/Button'
import ChatSearchBox from './ChatSearchBox'
import {GENERAL_CHAT_ID} from 'constants/database'
import {addEvent, removeEvent} from 'helpers/listenerHelpers'
import {textIsOverflown} from 'helpers/domHelpers'
import FullTextReveal from 'components/FullTextReveal'
import {socket} from 'constants/io'
import {queryStringForArray} from 'helpers/apiHelpers'
import FlatLoadMoreButton from 'components/LoadMoreButton/Flat'

const channelName = (channels, currentChannel) => {
  for (let i = 0; i < channels.length; i++) {
    if (channels[i].id === currentChannel.id) {
      return channels[i].channelName
    }
  }
  return null
}

class Chat extends Component {
  static propTypes = {
    onUnmount: PropTypes.func.isRequired,
    notifyThatMemberLeftChannel: PropTypes.func,
    currentChannel: PropTypes.object,
    channels: PropTypes.array,
    selectedChannelId: PropTypes.number,
    userId: PropTypes.number,
    loadMoreButton: PropTypes.bool,
    channelLoadMoreButtonShown: PropTypes.bool,
    messages: PropTypes.array,
    loadMoreMessages: PropTypes.func,
    loadMoreChannels: PropTypes.func,
    submitMessage: PropTypes.func,
    username: PropTypes.string,
    profilePicId: PropTypes.number,
    sendFirstDirectMessage: PropTypes.func,
    partnerId: PropTypes.number,
    enterChannelWithId: PropTypes.func,
    enterEmptyChat: PropTypes.func,
    createNewChannel: PropTypes.func,
    receiveMessage: PropTypes.func,
    receiveMessageOnDifferentChannel: PropTypes.func,
    receiveFirstMsg: PropTypes.func,
    editChannelTitle: PropTypes.func,
    hideChat: PropTypes.func,
    leaveChannel: PropTypes.func,
    openDirectMessageChannel: PropTypes.func,
    pageVisible: PropTypes.bool,
    subjectId: PropTypes.number
  }

  constructor() {
    super()
    this.state = {
      loading: false,
      currentChannelOnlineMembers: [],
      createNewChannelModalShown: false,
      inviteUsersModalShown: false,
      userListModalShown: false,
      editTitleModalShown: false,
      onTitleHover: false,
      listScrollPosition: 0,
      channelsLoading: false
    }

    this.onCreateNewChannel = this.onCreateNewChannel.bind(this)
    this.onNewButtonClick = this.onNewButtonClick.bind(this)
    this.onMessageSubmit = this.onMessageSubmit.bind(this)
    this.onReceiveMessage = this.onReceiveMessage.bind(this)
    this.onChatInvitation = this.onChatInvitation.bind(this)
    this.userListDescriptionShown = this.userListDescriptionShown.bind(this)
    this.onInviteUsersDone = this.onInviteUsersDone.bind(this)
    this.onEditTitleDone = this.onEditTitleDone.bind(this)
    this.onHideChat = this.onHideChat.bind(this)
    this.onLeaveChannel = this.onLeaveChannel.bind(this)
    this.onMouseOverTitle = this.onMouseOverTitle.bind(this)
    this.loadMoreChannels = this.loadMoreChannels.bind(this)
    this.onListScroll = this.onListScroll.bind(this)
    this.onSubjectChange = this.onSubjectChange.bind(this)
  }

  componentDidMount() {
    this.mounted = true
    const {notifyThatMemberLeftChannel, currentChannel} = this.props
    socket.on('receive_message', this.onReceiveMessage)
    socket.on('subject_change', this.onSubjectChange)
    socket.on('chat_invitation', this.onChatInvitation)
    socket.on('change_in_members_online', data => {
      let forCurrentChannel = data.channelId === this.props.currentChannel.id
      if (forCurrentChannel) {
        if (data.leftChannel) {
          const {userId, username, profilePicId} = data.leftChannel
          notifyThatMemberLeftChannel({channelId: data.channelId, userId, username, profilePicId})
        }
        if (this.mounted) {
          this.setState({
            currentChannelOnlineMembers: data.membersOnline
          })
        }
      }
    })
    socket.emit('check_online_members', currentChannel.id, (err, data) => {
      if (err) console.error(err)
      if (this.mounted) {
        this.setState({currentChannelOnlineMembers: data.membersOnline})
      }
    })
    addEvent(this.channelList, 'scroll', this.onListScroll)
  }

  componentDidUpdate(prevProps) {
    const {currentChannel} = this.props

    if (prevProps.channels[0] !== this.props.channels[0] && currentChannel.id === this.props.channels[0].id) {
      this.channelList.scrollTop = 0
    }

    if (prevProps.selectedChannelId !== this.props.selectedChannelId) {
      this.setState({loading: true})
    }

    if (prevProps.currentChannel.id !== currentChannel.id) {
      socket.emit('check_online_members', currentChannel.id, (err, data) => {
        if (err) console.error(err)
        if (this.mounted) {
          this.setState({
            currentChannelOnlineMembers: data.membersOnline,
            loading: false
          })
        }
      })
    }
  }

  componentWillUnmount() {
    this.mounted = false
    const {onUnmount} = this.props
    socket.removeListener('receive_message', this.onReceiveMessage)
    socket.removeListener('chat_invitation', this.onChatInvitation)
    socket.removeListener('subject_change', this.onSubjectChange)
    socket.removeListener('change_in_members_online')
    removeEvent(this.channelList, 'scroll', this.onScroll)
    onUnmount()
  }

  render() {
    const {channels, currentChannel, userId, channelLoadMoreButtonShown} = this.props
    const {
      loading,
      createNewChannelModalShown,
      inviteUsersModalShown,
      userListModalShown,
      editTitleModalShown,
      onTitleHover,
      currentChannelOnlineMembers,
      channelsLoading
    } = this.state

    let menuProps = (currentChannel.twoPeople) ?
      [{label: 'Hide Chat', onClick: this.onHideChat}] : [{
        label: 'Invite People',
        onClick: () => this.setState({inviteUsersModalShown: true})
      },
      {
        label: 'Edit Channel Name',
        onClick: () => this.setState({editTitleModalShown: true})
      },
      {
        separator: true
      },
      {
        label: 'Leave Channel',
        onClick: this.onLeaveChannel
      }]

    return (
      <div style={{display: 'flex', height: '88%', backgroundColor: '#fff'}}>
        {createNewChannelModalShown &&
          <CreateNewChannelModal
            userId={userId}
            onHide={() => this.setState({createNewChannelModalShown: false})}
            onDone={this.onCreateNewChannel}
          />
        }
        {inviteUsersModalShown &&
          <InviteUsersModal
            onHide={() => this.setState({inviteUsersModalShown: false})}
            currentChannel={currentChannel}
            onDone={this.onInviteUsersDone}
          />
        }
        {editTitleModalShown &&
          <EditTitleModal
            title={channelName(channels, currentChannel)}
            onHide={() => this.setState({editTitleModalShown: false})}
            onDone={this.onEditTitleDone}
          />
        }
        {userListModalShown &&
          <UserListModal
            onHide={() => this.setState({userListModalShown: false})}
            users={this.returnUsers(currentChannel, currentChannelOnlineMembers)}
            descriptionShown={this.userListDescriptionShown}
            description="(online)"
            title="Online Status"
          />
        }
        <div
          className="col-xs-3"
          style={{
            border: '1px solid #eee',
            marginLeft: '0.5em',
            paddingTop: '0.5em',
            height: '96%'
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
                ref={ref => { this.channelTitle = ref }}
                style={{
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  lineHeight: 'normal',
                  marginBottom: '0px',
                  cursor: 'default',
                  color: !channelName(channels, currentChannel) && '#7c7c7c'
                }}
                onMouseOver={this.onMouseOverTitle}
                onMouseLeave={() => this.setState({onTitleHover: false})}
              >
                {
                  channelName(channels, currentChannel) ?
                    cleanString(channelName(channels, currentChannel)) : '(Deleted)'
                }
              </h4>
              <FullTextReveal
                text={cleanString(channelName(channels, currentChannel))}
                show={onTitleHover}
                width='600px'
              />
              {currentChannel.id !== 0 ?
                <small>
                  <a
                    style={{
                      cursor: 'pointer'
                    }}
                    onClick={() => this.setState({userListModalShown: true})}
                  >{this.renderNumberOfMembers()}</a> online
                </small> : <small>{'\u00a0'}</small>
              }
            </div>
            <Button
              className="btn btn-default btn-sm pull-right"
              onClick={this.onNewButtonClick}
            >+New</Button>
          </div>
          <ChatSearchBox />
          <div
            className="row"
            style={{
              marginTop: '1em',
              overflow: 'scroll',
              position: 'absolute',
              height: '75%',
              width: '100%'
            }}
            ref={ref => { this.channelList = ref }}
          >
            {this.renderChannels()}
            {channelLoadMoreButtonShown && <FlatLoadMoreButton
              isLoading={channelsLoading}
              onClick={this.loadMoreChannels}
            />}
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
          {currentChannel.id !== GENERAL_CHAT_ID &&
            <DropdownButton
              style={{
                position: 'absolute',
                zIndex: 100,
                top: '0px',
                right: '0px'
              }}
              shape="button"
              icon="menu-hamburger"
              text="Menu"
              menuProps={menuProps}
            />
          }
          <MessagesContainer
            loading={loading}
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
              currentChannelId={this.props.currentChannel.id}
              onMessageSubmit={this.onMessageSubmit}
            />
          </div>
        </div>
      </div>
    )
  }

  renderChannels() {
    const {userId, currentChannel, channels, selectedChannelId} = this.props
    return channels.filter(channel => !channel.isHidden).map(channel => {
      const {lastMessageSender, lastMessage, id, channelName, numUnreads} = channel
      return (
        <div
          className="media chat-channel-item container-fluid"
          style={{
            width: '100%',
            backgroundColor: id === selectedChannelId && '#f7f7f7',
            cursor: 'pointer',
            padding: '1em',
            marginTop: '0px'
          }}
          onClick={() => this.onChannelEnter(id)}
          key={id}
        >
          <div>
            <h4
              style={{
                color: !channelName && '#7c7c7c',
                marginTop: '0px',
                marginBottom: '0.2em',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
                lineHeight: 'normal'
              }}
            >
              {channelName ? cleanString(channelName) : '(Deleted)'}
            </h4>
            <span>
              <span
                className="pull-left"
                style={{
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  width: '85%',
                  maxWidth: '20em',
                  display: 'block'
                }}
              >
                <span>
                  {lastMessageSender && lastMessage ?
                    `${lastMessageSender.id === userId ? 'You' : lastMessageSender.username}: ${lastMessage}` : '\u00a0'
                  }
                </span>
              </span>
              {id !== currentChannel.id && numUnreads > 0 &&
                <span className="pull-right">&nbsp;<span className="badge" style={{backgroundColor: 'red'}}>{numUnreads}</span></span>
              }
            </span>
          </div>
        </div>
      )
    })
  }

  loadMoreChannels() {
    const {currentChannel, channels, loadMoreChannels} = this.props
    const {channelsLoading} = this.state
    if (!channelsLoading) {
      this.setState({channelsLoading: true})
      loadMoreChannels(currentChannel.id, queryStringForArray(channels, 'id', 'channelIds')).then(
        () => this.setState({channelsLoading: false})
      )
    }
  }

  renderNumberOfMembers() {
    const {currentChannel} = this.props
    const {currentChannelOnlineMembers} = this.state
    const numberOfMembers = currentChannel.members.length
    return `${currentChannelOnlineMembers.length || 1}${numberOfMembers <= 1 ? '' : '/' + numberOfMembers}`
  }

  userListDescriptionShown(user) {
    const {currentChannelOnlineMembers} = this.state
    let result = false
    for (let i = 0; i < currentChannelOnlineMembers.length; i++) {
      if (user.userId === currentChannelOnlineMembers[i].userId) result = true
    }
    return result
  }

  returnUsers({members: allMembers}, currentChannelOnlineMembers) {
    return (allMembers.length > 0) ? allMembers : currentChannelOnlineMembers
  }

  onListScroll() {
    if (
      this.channelList.scrollTop >=
      (this.channelList.scrollHeight - this.channelList.offsetHeight) * 0.7) {
      this.loadMoreChannels()
    }
  }

  onMessageSubmit(message) {
    const {
      submitMessage,
      userId,
      username,
      profilePicId,
      currentChannel,
      channels,
      sendFirstDirectMessage,
      partnerId,
      subjectId
    } = this.props
    let isFirstDirectMessage = currentChannel.id === 0
    if (isFirstDirectMessage) {
      return sendFirstDirectMessage({message, userId, partnerId}).then(
        chat => {
          socket.emit('join_chat_channel', chat.channelId)
          socket.emit('send_bi_chat_invitation', partnerId, chat)
        }
      )
    }

    let params = {
      userId,
      username,
      profilePicId,
      content: message,
      channelId: currentChannel.id,
      subjectId
    }
    let channel = channels.filter(channel => channel.id === currentChannel.id).map(
      channel => ({
        ...channel,
        channelName: currentChannel.twoPeople ? username : channel.channelName,
        lastMessage: message,
        lastMessageSender: {
          id: userId,
          username
        },
        numUnreads: 1
      })
    )
    submitMessage(params).then(
      message => socket.emit('new_chat_message', message, channel)
    )
  }

  onNewButtonClick() {
    this.setState({createNewChannelModalShown: true})
  }

  onChannelEnter(id) {
    const {enterChannelWithId, enterEmptyChat} = this.props
    if (id === 0) {
      this.setState({currentChannelOnlineMembers: []})
      return enterEmptyChat()
    }
    enterChannelWithId(id)
  }

  onCreateNewChannel(params) {
    const {createNewChannel, username, userId, openDirectMessageChannel} = this.props
    if (params.selectedUsers.length === 1) {
      const partner = params.selectedUsers[0]
      return openDirectMessageChannel({username, userId}, partner, true).then(
        () => this.setState({createNewChannelModalShown: false})
      )
    }

    createNewChannel(params, data => {
      const users = params.selectedUsers.map(user => {
        return user.userId
      })
      socket.emit('join_chat_channel', data.message.channelId)
      socket.emit('send_group_chat_invitation', users, data)
      this.setState({createNewChannelModalShown: false})
    })
  }

  onReceiveMessage(message, channel) {
    const {pageVisible, receiveMessage, receiveMessageOnDifferentChannel, currentChannel, userId} = this.props
    let messageIsForCurrentChannel = message.channelId === currentChannel.id
    let senderIsNotTheUser = message.userId !== userId
    if (messageIsForCurrentChannel && senderIsNotTheUser) {
      receiveMessage({message, pageVisible})
    }
    if (!messageIsForCurrentChannel) {
      receiveMessageOnDifferentChannel({message, channel, senderIsNotTheUser})
    }
  }

  onSubjectChange({message}) {
    const {pageVisible, receiveMessage, receiveMessageOnDifferentChannel, currentChannel, userId} = this.props
    let messageIsForCurrentChannel = message.channelId === currentChannel.id
    let senderIsNotTheUser = message.userId !== userId
    if (messageIsForCurrentChannel && senderIsNotTheUser) {
      receiveMessage({message, pageVisible})
    }
    if (!messageIsForCurrentChannel) {
      receiveMessageOnDifferentChannel({
        message,
        senderIsNotTheUser,
        channel: [{
          id: 2,
          lastUpdate: message.timeStamp,
          isHidden: false,
          channelName: 'General',
          lastMessage: message.content,
          lastMessageSender: {
            id: message.userId,
            username: message.username
          },
          numUnreads: 1
        }]
      })
    }
  }

  onChatInvitation(data) {
    const {receiveFirstMsg, currentChannel, pageVisible, userId} = this.props
    let duplicate = false
    if (currentChannel.id === 0) {
      if (
        data.members.filter(member => member.userId !== userId)[0].userId ===
        currentChannel.members.filter(member => member.userId !== userId)[0].userId
      ) duplicate = true
    }
    receiveFirstMsg({data, duplicate, pageVisible})
    socket.emit('join_chat_channel', data.channelId)
  }

  onInviteUsersDone(users, message) {
    socket.emit('new_chat_message', {
      ...message,
      channelId: message.channelId
    })
    socket.emit('send_group_chat_invitation', users, {message: {...message, messageId: message.id}})
    this.setState({inviteUsersModalShown: false})
  }

  onEditTitleDone(title) {
    const {editChannelTitle, currentChannel} = this.props
    editChannelTitle({title, channelId: currentChannel.id}, () => {
      this.setState({editTitleModalShown: false})
    })
  }

  onHideChat() {
    const {hideChat, currentChannel} = this.props
    hideChat(currentChannel.id)
  }

  onLeaveChannel() {
    const {leaveChannel, currentChannel, userId, username, profilePicId} = this.props
    leaveChannel(currentChannel.id)
    socket.emit('leave_chat_channel', {channelId: currentChannel.id, userId, username, profilePicId})
  }

  onMouseOverTitle() {
    if (textIsOverflown(this.channelTitle)) {
      this.setState({onTitleHover: true})
    }
  }
}

export default connect(
  state => ({
    userId: state.UserReducer.userId,
    username: state.UserReducer.username,
    pageVisible: state.ViewReducer.pageVisible,
    profilePicId: state.UserReducer.profilePicId,
    currentChannel: state.ChatReducer.currentChannel,
    selectedChannelId: state.ChatReducer.selectedChannelId,
    channels: state.ChatReducer.channels,
    messages: state.ChatReducer.messages,
    channelLoadMoreButtonShown: state.ChatReducer.channelLoadMoreButton,
    loadMoreButton: state.ChatReducer.loadMoreMessages,
    partnerId: state.ChatReducer.partnerId,
    subjectId: state.ChatReducer.subject.id
  }),
  {
    receiveMessage: ChatActions.receiveMessage,
    receiveMessageOnDifferentChannel: ChatActions.receiveMessageOnDifferentChannel,
    receiveFirstMsg: ChatActions.receiveFirstMsg,
    enterChannelWithId: ChatActions.enterChannelWithId,
    enterEmptyChat: ChatActions.enterEmptyChat,
    submitMessage: ChatActions.submitMessageAsync,
    loadMoreChannels: ChatActions.loadMoreChannels,
    loadMoreMessages: ChatActions.loadMoreMessagesAsync,
    createNewChannel: ChatActions.createNewChannelAsync,
    sendFirstDirectMessage: ChatActions.sendFirstDirectMessage,
    hideChat: ChatActions.hideChatAsync,
    leaveChannel: ChatActions.leaveChannelAsync,
    editChannelTitle: ChatActions.editChannelTitle,
    notifyThatMemberLeftChannel: ChatActions.notifyThatMemberLeftChannel,
    openDirectMessageChannel: ChatActions.openDirectMessageChannel
  }
)(Chat)
