'use strict';

import _ from 'lodash';
import React from 'react';
import Message from 'components/Message';
import ChannelControls from 'components/ChannelControls';
import NewMessageNotification from 'components/NewMessageNotification';
import Dropzone from 'react-dropzone';
import MessageStore from 'stores/MessageStore';
import ChannelStore from 'stores/ChannelStore';
import LoadingStateStore from 'stores/LoadingStateStore';
import UIActions from 'actions/UIActions';
import ChannelActions from 'actions/ChannelActions';
import 'styles/Channel.scss';
import Logger from 'logplease';
const logger = Logger.create('Channel', { color: Logger.Colors.Cyan });

class Channel extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      channelChanged: true,
      channelName: null,
      messages: [],
      loading: false,
      loadingText: '',
      reachedChannelStart: false,
      channelMode: "Public",
      error: null,
      dragEnter: false,
      username: props.user ? props.user.username : '',
      unreadMessages: 0,
      appSettings: props.appSettings,
      theme: props.theme
    };

    this.scrollTimer = null;
    this.topMargin = 120;
    this.bottomMargin = 20;
    this.stopListeningChannelState = ChannelActions.reachedChannelStart.listen(this._onReachedChannelStart.bind(this));
  }

  componentWillReceiveProps(nextProps) {
    // logger.debug("PROPS CHANGED", nextProps, this.state.channelName);
    if(nextProps.channel !== this.state.channelName) {
      this.setState({
        channelChanged: true,
        unreadMessages: 0,
        loading: true,
        reachedChannelStart: false,
        messages: []
      });
      UIActions.focusOnSendMessage();
      // this._onLoadStateChange(nextProps.channel, LoadingStateStore.state);
      // this._onChannelStateChanged(nextProps.channel);
      ChannelActions.loadMessages(nextProps.channel);
    }

    this.setState({
      channelName: nextProps.channel,
      username: nextProps.user ? nextProps.user.username : '',
      appSettings: nextProps.appSettings,
      theme: nextProps.theme
    });

    this._updateLoadingState(nextProps.channelInfo);
  }

  componentDidMount() {
    this.stopListeningChannelUpdates = ChannelStore.listen(this._onChannelStateChanged.bind(this));
    this.unsubscribeFromMessageStore = MessageStore.listen(this.onNewMessages.bind(this));
    // this.stopListeningLoadingState = LoadingStateStore.listen((state) => this._onLoadStateChange(this.state.channelName, state));
    this.unsubscribeFromErrors = UIActions.raiseError.listen(this._onError.bind(this));
    this.node = this.refs.MessagesView;
    // this._onLoadStateChange(this.state.channelName, LoadingStateStore.state);
  }

  _updateLoadingState(channel) {
    if(channel) {
      // logger.debug("CHANNEL STATE CHANGED", channel, this.state.channelName);
      const loading = (channel.state.loading || channel.state.syncing > 0);
      const text = loading ? 'Syncing...' : '';
      logger.debug(loading, text);
      this.setState({ loading: loading, loadingText: text });
    }
  }

  _onChannelStateChanged(channels) {
    const channelInfo = channels.find((e) => e.name === this.state.channelName);
    // logger.debug("Channels state updated for", channel)
    if(channelInfo)
      this._updateLoadingState(channelInfo);
    // logger.debug("CHANNEL STATE CHANGED", channelName, this.state.channelName);
    // if(channelName === this.state.channelName) {
    //   const channel = ChannelStore.channels.find((e) => e.name === channelName);
    //   logger.debug("-- next")
    //   // logger.debug(channel);
    //   if(channel) {
    //     const loading = (channel.state.loading || channel.state.syncing > 0);
    //     const text = loading ? 'Syncing...' : '';
    //     logger.debug(loading, text);
    //     this.setState({ loading: loading, loadingText: text });
    //   }
    // }
  }

  // _onLoadStateChange(channel, state) {
  //   if(!channel || !state)
  //     return;

  //   // logger.debug("LOAD STATE")
  //   // console.log(channel);
  //   // console.log(state);

  //   const loadingState = state[channel];
  //   if(loadingState) {
  //     const loading = Object.keys(loadingState).filter((f) => loadingState[f]);
  //     const loadingText = loadingState[_.last(loading)] ? loadingState[_.last(loading)].message : null;
  //     logger.debug("STATE SET", loading.length > 0, loadingText)
  //     console.log(loadingState)
  //     this.setState({ loadingText: loadingText });
  //   } else {
  //     logger.debug("NOT LOADING")
  //     this.setState({ loading: false });
  //   }
  // }

  _onError(errorMessage) {
    console.error("Channel:", errorMessage);
    this.setState({ error: errorMessage });
  }

  _onReachedChannelStart() {
    logger.warn("REACHED CHANNEL START")
    this.setState({ reachedChannelStart: true });
  }

  componentWillUnmount() {
    clearTimeout(this.scrollTimer);
    this.unsubscribeFromMessageStore();
    this.unsubscribeFromErrors();
    // this.stopListeningLoadingState();
    this.stopListeningChannelState();
    this.stopListeningChannelUpdates();
    this.setState({ messages: [] });
  }

  onNewMessages(channel: string, messages) {
    if(channel !== this.state.channelName)
      return;

    this.node = this.refs.MessagesView;
    if(this.node.scrollHeight - this.node.scrollTop + this.bottomMargin > this.node.clientHeight
      && this.node.scrollHeight > this.node.clientHeight + 1
      && this.state.messages.length > 0 && _.last(messages).payload.meta.ts > _.last(this.state.messages).payload.meta.ts
      && this.node.scrollHeight > 0) {
      this.setState({
        unreadMessages: this.state.unreadMessages + 1
      });
    }

    this.setState({ messages: messages });
  }

  sendMessage(text: string) {
    if(text !== '')
      ChannelActions.sendMessage(this.state.channelName, text);
  }

  sendFile(filePath: string, buffer, meta) {
    if(filePath !== '' || buffer !== null)
      ChannelActions.addFile(this.state.channelName, filePath, buffer, meta);
  }

  loadOlderMessages() {
    if(!this.state.loading) {
      ChannelActions.loadMoreMessages(this.state.channelName);
    }
  }

  componentWillUpdate() {
    this.node = this.refs.MessagesView;
    this.scrollTop = this.node.scrollTop;
    this.scrollHeight = this.node.scrollHeight;
  }

  componentDidUpdate() {
    this.node = this.refs.MessagesView;
    this.scrollAmount = this.node.scrollHeight - this.scrollHeight;
    this.keepScrollPosition = (this.scrollAmount > 0 && this.scrollTop > (0 + this.topMargin)) || this.state.reachedChannelStart;
    this.shouldScrollToBottom = (this.node.scrollTop + this.node.clientHeight + this.bottomMargin) >= this.scrollHeight;

    if(!this.keepScrollPosition)
      this.node.scrollTop += this.scrollAmount;

    if(this.shouldScrollToBottom)
      this.node.scrollTop = this.node.scrollHeight + this.node.clientHeight;

    // If the channel was changed, scroll to bottom to avoid weird positioning
    // TODO: replace with remembering each channel's scroll position on channel change
    if(this.state.channelChanged) {
      this.onScrollToBottom();
      this.setState({ channelChanged: false });
    }

    // Wait for the render (paint) cycle to finish before checking.
    // The DOM element sizes (ie. scrollHeight and clientHeight) are not updated until the paint cycle finishes.
    if(this.loadMoreTimeout) clearTimeout(this.loadMoreTimeout);
    this.loadMoreTimeout = setTimeout(() => {
      if(this._shouldLoadMoreMessages())
        this.loadOlderMessages();
    }, 20);
  }

  _shouldLoadMoreMessages() {
    return this.node && (this.node.scrollTop - this.topMargin <= 0 || this.node.scrollHeight === this.node.clientHeight);
  }

  onDrop(files) {
    this.setState({ dragEnter: false });
    files.forEach((file) => {
      if(file.path) {
        this.sendFile(file.path);
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          this.sendFile(file.name, event.target.result, {
            mimeType: file.type,
          });
        };
        reader.readAsArrayBuffer(file);
        // console.error("File upload not yet implemented in browser. Try the electron app.");
      }
    });
    UIActions.focusOnSendMessage();
  }

  onDragEnter() {
    this.setState({ dragEnter: true });
  }

  onDragLeave() {
    this.setState({ dragEnter: false });
  }

  onScroll() {
    if(this.scrollTimer)
      clearTimeout(this.scrollTimer);

    // After scroll has finished, check if we should load more messages
    // Using timeout here because of OS-applied scroll inertia
    this.scrollTimer = setTimeout(() => {
      if(this._shouldLoadMoreMessages())
        this.loadOlderMessages();
    }, 800);

    // If we scrolled to the bottom, hide the "new messages" label
    this.node = this.refs.MessagesView;
    if(this.node.scrollHeight - this.node.scrollTop - 10 <= this.node.clientHeight) {
      this.setState({
        unreadMessages: 0
      });
    }
  }

  onScrollToBottom() {
    UIActions.focusOnSendMessage();
    this.node.scrollTop = this.node.scrollHeight + this.node.clientHeight;
  }

  renderMessages() {
    const { messages, username, channelName, loading, loadingText, reachedChannelStart, appSettings } = this.state;
    const { colorifyUsernames, useEmojis, useMonospaceFont, font, monospaceFont, spacing } = appSettings;
    const elements = messages.map((message) => (
      <Message
        message={message.payload}
        key={message.hash}
        onDragEnter={this.onDragEnter.bind(this)}
        highlightWords={username}
        colorifyUsername={colorifyUsernames}
        useEmojis={useEmojis}
        style={{
          fontFamily: useMonospaceFont ? monospaceFont : font,
          fontSize: useMonospaceFont ? '0.9em' : '1.0em',
          fontWeight: useMonospaceFont ? '100' : '300',
          padding: spacing,
        }}
      />
    ));
    elements.unshift(
      <div className="firstMessage" key="firstMessage" onClick={this.loadOlderMessages.bind(this)}>
        {reachedChannelStart && !loading ? `Beginning of #${channelName}` : loadingText || '???'}
      </div>
    );
    return elements;
  }

  renderFileDrop() {
    const { theme, dragEnter, channelName } = this.state;
    if (dragEnter) {
      return (
        <Dropzone
          className="dropzone"
          activeClassName="dropzoneActive"
          disableClick={true}
          onDrop={this.onDrop.bind(this)}
          onDragEnter={this.onDragEnter.bind(this)}
          onDragLeave={this.onDragLeave.bind(this)}
          style={theme} >
            <div ref="dropLabel" style={theme}>Add files to #{channelName}</div>
        </Dropzone>
      );
    }
    return null;
  }

  render() {
    const { unreadMessages, loading, channelMode, appSettings, theme } = this.state;
    return (
      <div className="Channel flipped" onDragEnter={this.onDragEnter.bind(this)}>
        <div className="Messages" ref="MessagesView" onScroll={this.onScroll.bind(this)}>
          {this.renderMessages()}
        </div>
        <NewMessageNotification
          onClick={this.onScrollToBottom.bind(this)}
          unreadMessages={unreadMessages} />
        <ChannelControls
          onSendMessage={this.sendMessage.bind(this)}
          onSendFiles={this.onDrop.bind(this)}
          isLoading={loading}
          channelMode={channelMode}
          appSettings={appSettings}
          theme={theme} />
        {this.renderFileDrop()}
      </div>
    );
  }

}

export default Channel;
