import request from 'axios'
import {auth, handleError} from '../constants'
import * as actions from './actions'
import {GENERAL_CHAT_ID} from 'constants/database'
import {URL} from 'constants/URL'

const API_URL = `${URL}/chat`

export const changeChatSubject = subject => ({
  type: 'CHANGE_CHAT_SUBJECT',
  subject
})

export const selectChannel = channelId => dispatch => {
  dispatch({
    type: 'SELECT_CHANNEL',
    channelId
  })
  return Promise.resolve()
}

export const enterChannelWithId = (channelId, showOnTop) => dispatch => {
  dispatch(selectChannel(channelId)).then(
    () => request.get(`${API_URL}/channel?channelId=${channelId}`, auth())
  ).then(
    response => dispatch({
      type: 'ENTER_CHANNEL',
      data: response.data,
      showOnTop
    })
  ).catch(
    error => {
      console.error(error.response || error)
      handleError(error, dispatch)
    }
  )
}

export const resetMsgUnreadsOnTabSwitch = () => ({
  type: 'RESET_MSG_UNREADS_ON_TAB_SWITCH'
})

export const clearChatSearchResults = () => ({
  type: 'CLEAR_CHAT_SEARCH_RESULTS'
})

export const clearSubjectSearchResults = () => ({
  type: 'CLEAR_SUBJECT_SEARCH_RESULTS'
})

export const clearUserSearchResults = () => ({
  type: 'CLEAR_USER_SEARCH_RESULTS'
})

export const createNewChannelAsync = (params, callback) => dispatch =>
  request.post(`${API_URL}/channel`, {params}, auth()).then(
    response => {
      dispatch(actions.createNewChannel(response.data))
      callback(response.data)
    }
  ).catch(
    error => {
      console.error(error.response || error)
      handleError(error, dispatch)
    }
  )

export const deleteMessage = messageId => dispatch =>
  request.delete(`${API_URL}/message?messageId=${messageId}`, auth()).then(
    response => {
      dispatch({
        type: 'DELETE_CHAT_MESSAGE',
        messageId
      })
      return Promise.resolve()
    }
  )

export const editChannelTitle = (params, callback) => dispatch =>
  request.post(`${API_URL}/title`, params, auth()).then(
    response => {
      dispatch(actions.applyChangedChannelTitle(params))
      if (callback) callback()
    }
  ).catch(
    error => {
      console.error(error.response || error)
      handleError(error, dispatch)
    }
  )

export const editMessage = ({editedMessage, messageId}) => dispatch =>
  request.put(`${API_URL}/message`, {editedMessage, messageId}, auth()).then(
    response => {
      dispatch({
        type: 'EDIT_CHAT_MESSAGE',
        data: {editedMessage, messageId}
      })
      return Promise.resolve()
    }
  ).catch(
    error => {
      console.error(error.response || error)
      handleError(error, dispatch)
    }
  )

export const enterEmptyChat = () => ({
  type: 'ENTER_EMPTY_CHAT'
})

export const getNumberOfUnreadMessagesAsync = () => dispatch => {
  if (auth() === null) return
  request.get(`${API_URL}/numUnreads`, auth()).then(
    response => {
      dispatch({
        type: 'GET_NUM_UNREAD_MSGS',
        numUnreads: response.data.numUnreads
      })
    }
  ).catch(
    error => {
      console.error(error.response || error)
      handleError(error, dispatch)
    }
  )
}

export const hideChatAsync = channelId => dispatch =>
  request.post(`${API_URL}/hideChat`, {channelId}, auth()).then(
    response => {
      dispatch(actions.hideChat(channelId))
      dispatch(enterChannelWithId(GENERAL_CHAT_ID, true))
    }
  ).catch(
    error => {
      console.error(error.response || error)
      handleError(error, dispatch)
    }
  )

export const increaseNumberOfUnreadMessages = () => ({
  type: 'INCREASE_NUM_UNREAD_MSGS'
})

export const initChatAsync = (channelId) => dispatch =>
  request.get(`${API_URL}?channelId=${channelId}`, auth()).then(
    response => {
      dispatch({
        type: 'INIT_CHAT',
        data: response.data
      })
      return Promise.resolve()
    }
  ).catch(
    error => {
      console.error(error.response || error)
      handleError(error, dispatch)
    }
  )

export const inviteUsersToChannelAsync = (params, callback) => dispatch =>
  request.post(`${API_URL}/invite`, params, auth()).then(
    response => {
      const {message} = response.data
      let data = {
        ...params,
        message
      }
      dispatch(actions.inviteUsersToChannel(data))
      callback(message)
    }
  ).catch(
    error => {
      console.error(error.response || error)
      handleError(error, dispatch)
    }
  )

export const loadChatSubject = () => dispatch =>
  request.get(`${API_URL}/chatSubject`).then(
    response => {
      dispatch({
        type: 'LOAD_CHAT_SUBJECT',
        subject: response.data
      })
      return Promise.resolve()
    }
  ).catch(
    error => {
      console.error(error.response || error)
      handleError(error, dispatch)
    }
  )

export const loadMoreChannels = (currentChannelId, channelIds) => dispatch =>
  request.get(`${API_URL}/more/channels?currentChannelId=${currentChannelId}&${channelIds}`, auth()).then(
    response => {
      dispatch({
        type: 'LOAD_MORE_CHANNELS',
        data: response.data
      })
      Promise.resolve()
    }
  ).catch(
    error => {
      console.error(error.response || error)
      handleError(error, dispatch)
    }
  )

export const loadMoreMessagesAsync = (userId, messageId, channelId, callback) => dispatch =>
  request.get(`${API_URL}/more/messages?userId=${userId}&messageId=${messageId}&channelId=${channelId}`, auth())
    .then(
      response => {
        dispatch(actions.loadMoreMessages(response.data))
        callback()
      }
    ).catch(
      error => {
        console.error(error.response || error)
        handleError(error, dispatch)
      }
    )

export const leaveChannelAsync = channelId => dispatch => {
  const timeStamp = Math.floor(Date.now()/1000)
  request.delete(`${API_URL}/channel?channelId=${channelId}&timeStamp=${timeStamp}`, auth()).then(
    response => {
      dispatch(actions.leaveChannel(channelId))
      dispatch(enterChannelWithId(GENERAL_CHAT_ID, true))
    }
  ).catch(
    error => {
      console.error(error.response || error)
      handleError(error, dispatch)
    }
  )
}

export const notifyThatMemberLeftChannel = data => ({
  type: 'NOTIFY_MEMBER_LEFT',
  data
})

export const openDirectMessageChannel = (user, partner, chatCurrentlyOn) => dispatch => {
  function fetchChannels(currentChannel) {
    if (!chatCurrentlyOn) {
      return request.get(`${API_URL}/channels?currentChannelId=${currentChannel.channelId}`, auth()).then(
        response => Promise.resolve({currentChannel, channels: response.data})
      )
    }
    return Promise.resolve({currentChannel, channels: []})
  }
  return request.get(`${API_URL}/channel/check?partnerId=${partner.userId}`, auth()).then(
    response => fetchChannels(response.data)
  ).then(
    ({currentChannel, channels}) => {
      dispatch({
        type: 'OPEN_CHAT_FOR_DM',
        user,
        partner,
        channels,
        ...currentChannel
      })
      return Promise.resolve()
    }
  ).catch(
    error => {
      console.error(error.response || error)
      handleError(error, dispatch)
    }
  )
}

export const receiveMessage = ({message, pageVisible}) => dispatch => {
  const {channelId} = message
  request.post(`${API_URL}/lastRead`, {channelId}, auth()).then(
    response => dispatch({
      type: 'RECEIVE_MSG',
      pageVisible,
      data: {
        ...message,
        timeStamp: Math.floor(Date.now()/1000)
      }
    })
  ).catch(
    error => {
      console.error(error.response || error)
      handleError(error, dispatch)
    }
  )
}

export const receiveMessageOnDifferentChannel = ({message, channel, senderIsNotTheUser}) => ({
  type: 'RECEIVE_MSG_ON_DIFFERENT_CHANNEL',
  data: message,
  channel,
  senderIsNotTheUser
})

export const receiveFirstMsg = ({data, duplicate, pageVisible}) => ({
  type: 'RECEIVE_FIRST_MSG',
  data,
  duplicate,
  pageVisible
})

export const reloadChatSubject = subjectId => dispatch =>
  request.put(`${API_URL}/chatSubject/reload`, {subjectId}, auth()).then(
    ({data: {subject, message}}) => {
      dispatch({
        type: 'RELOAD_CHAT_SUBJECT',
        subject,
        message
      })
      return Promise.resolve({subject, message})
    }
  ).catch(
    error => {
      console.error(error.response || error)
      handleError(error, dispatch)
    }
  )

export const resetChat = () => dispatch => {
  dispatch({
    type: 'RESET_CHAT'
  })
  return Promise.resolve()
}

export const searchChatAsync = text => dispatch =>
  request.get(`${API_URL}/search/chat?text=${text}`, auth()).then(
    ({data}) => dispatch({
      type: 'SEARCH_CHAT',
      data
    })
  ).catch(
    error => {
      console.error(error.response || error)
      handleError(error, dispatch)
    }
  )

export const searchChatSubject = text => dispatch =>
  request.get(`${API_URL}/search/subject?text=${text}`).then(
    ({data}) => {
      dispatch({
        type: 'SEARCH_CHAT_SUBJECT',
        data
      })
      return Promise.resolve()
    }
  ).catch(
    error => {
      console.error(error.response || error)
      handleError(error, dispatch)
    }
  )

export const searchUserToInviteAsync = text => dispatch =>
  request.get(`${API_URL}/search/users?text=${text}`).then(
    response => dispatch(actions.searchUserToInvite(response.data))
  ).catch(
    error => {
      console.error(error.response || error)
      handleError(error, dispatch)
    }
  )

export const sendFirstDirectMessage = (params, callback) => dispatch => {
  let body = {
    ...params,
    timeStamp: Math.floor(Date.now()/1000)
  }
  return request.post(`${API_URL}/channel/twoPeople`, body, auth()).then(
    response => {
      dispatch({
        type: 'CREATE_NEW_CHAT',
        data: response.data
      })
      return Promise.resolve(response.data)
    }
  ).catch(
    error => {
      console.error(error.response || error)
      handleError(error, dispatch)
    }
  )
}

export const submitMessageAsync = (params) => dispatch => {
  let message = {
    ...params,
    timeStamp: Math.floor(Date.now() / 1000)
  }
  dispatch({
    type: 'SUBMIT_MESSAGE',
    message
  })
  return Promise.resolve(params)
}

export const saveMessage = (message, index) => dispatch => {
  return request.post(API_URL, {message}, auth()).then(
    response => {
      dispatch({
        type: 'ADD_ID_TO_NEW_MESSAGE',
        messageIndex: index,
        messageId: response.data.messageId
      })
    }
  ).catch(
    error => {
      console.error(error.response || error)
      handleError(error, dispatch)
    }
  )
}

export const turnChatOff = () => dispatch => {
  dispatch({
    type: 'TURN_CHAT_OFF'
  })
  return Promise.resolve()
}

export const uploadChatSubject = content => dispatch =>
  request.post(`${API_URL}/chatSubject`, {content}, auth()).then(
    response => {
      dispatch({
        type: 'UPLOAD_CHAT_SUBJECT',
        data: response.data
      })
      return Promise.resolve(response.data.subjectId)
    }
  ).catch(
    error => {
      console.error(error.response || error)
      handleError(error, dispatch)
    }
  )
