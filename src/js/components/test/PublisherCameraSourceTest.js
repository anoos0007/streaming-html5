/* global red5prosdk */
import React from 'react'
// import red5prosdk from 'red5pro-sdk'
import { PropTypes } from 'react'
import BackLink from '../BackLink' // eslint-disable-line no-unused-vars

const SELECT_DEFAULT = 'Select a camera...'

class PublisherCameraSourceTest extends React.Component {

  constructor (props) {
    super(props)
    this.state = {
      view: undefined,
      publisher: undefined,
      cameras: [{
        label: SELECT_DEFAULT
      }],
      selectedCamera: undefined,
      status: 'On hold.'
    }
  }

  waitForSelect () {
    const comp = this
    navigator.mediaDevices.enumerateDevices()
      .then(devices => {
        let videoCameras = devices.filter(item => {
          return item.kind === 'videoinput'
        })
        const cameras = [{
          label: SELECT_DEFAULT
        }].concat(videoCameras)
        comp.setState(state => {
          state.cameras = cameras
        })
      })
  }

  preview (mediaDeviceId) {
    const comp = this
    const createPromise = new Promise((resolve, reject) => {
      const publisher = new red5prosdk.RTCPublisher()
      const view = new red5prosdk.PublisherView('red5pro-publisher')
      const gmd = navigator.mediaDevice || navigator
      gmd.getUserMedia({
        audio: !comp.props.settings.audioOn ? false : true,
        video: {
          optional: [{
            sourceId: mediaDeviceId
          }]
        }
      }, media => {

        // Upon access of user media,
        // 1. Attach the stream to the publisher.
        // 2. Show the stream as preview in view instance.
        publisher.attachStream(media)
        view.preview(media, true)

        comp.setState(state => {
          state.publisher = publisher
          state.view = view
          state.selectedCamera = mediaDeviceId
          return state
        })

        resolve()

      }, error => {
        console.error(`[PublisherCameraSourceTest] :: Error - ${error}`)
        reject(error)
      })
    })

    if (this.state.publisher) {
      return this.state.publisher.unpublish()
    }
    return createPromise
  }

  publish () {
    const comp = this
    const iceServers = this.props.settings.iceServers
    const publisher = this.state.publisher
    const view = this.state.view
    view.attachPublisher(publisher);

    comp.setState(state => {
      state.status = 'Establishing connection...'
    })

    // Initialize
    publisher.init({
      protocol: 'ws',
      host: this.props.settings.host,
      port: this.props.settings.rtcport,
      app: this.props.settings.context,
      streamName: this.props.settings.stream1,
      streamType: 'webrtc',
      iceServers: iceServers
    })
    .then(() => {
      // Invoke the publish action
      comp.setState(state => {
        state.status = 'Starting publish session...'
      })
      return publisher.publish()
    })
    .then(() => {
      comp.setState(state => {
        state.status = 'Publishing started. You\'re Live!'
      })
    })
    .catch(error => {
      // A fault occurred while trying to initialize and publish the stream.
      const jsonError = typeof error === 'string' ? error : JSON.stringify(error, null, 2)
      comp.setState(state => {
        state.status = `ERROR: ${jsonError}`
      })
      console.error(`[PublisherCameraSourceTest] :: Error - ${jsonError}`)
    })

  }

  unpublish () {
    const comp = this
    return new Promise((resolve, reject) => {
      const view = comp.state.view
      const publisher = comp.state.publisher
      if (publisher) {
        publisher.unpublish()
          .then(() => {
            view.view.src = ''
            publisher.setView(undefined)
            comp.setState(state => {
              state.publisher = undefined
              state.view = undefined
              state.selectedCamera = undefined
              return state
            })
            resolve()
          })
          .catch(error => {
            const jsonError = typeof error === 'string' ? error : JSON.stringify(error, null, 2)
            console.error(`[PublishTest] :: Unmount Error = ${jsonError}`)
            reject(error)
          })
      }
      else {
        resolve()
      }
    })
  }

  onCameraSelect () {
    const comp = this
    const cameraSelected = comp._cameraSelect.value
    if (comp.state.selectedCamera !== cameraSelected &&
      (cameraSelected && cameraSelected !== SELECT_DEFAULT)) {
      const pub = comp.publish.bind(comp)
      comp.unpublish()
        .then(() => {
          return comp.preview(cameraSelected)
        })
        .then(pub)
        .catch(() => {
          console.error('[PublishTest] :: Error - Could not start publishing session.')
        })
    }
  }

  componentDidMount () {
    this.waitForSelect()
  }

  componentWillUnmount () {
    this.unpublish()
  }

  render () {
    const videoStyle = {
      'width': '100%',
      'max-width': '640px'
    }
    const labelStyle = {
      'margin-right': '0.5rem'
    }
    const cameraSelectField = {
      'background-color': '#ffffff',
      'padding': '0.8rem'
    }
    return (
      <div>
        <BackLink onClick={this.props.onBackClick} />
        <h1 className="centered">Publisher Camera Source Test</h1>
        <hr />
        <h2 className="centered"><em>stream</em>: {this.props.settings.stream1}</h2>
        <div className="instructions-block">
          <p>To begin this test, first select a camera from the following selections:</p>
          <p style={cameraSelectField}>
            <label for="camera-select" style={labelStyle}>Camera Source:</label>
            <select ref={c => this._cameraSelect = c}
              id="camera-select"
              onChange={this.onCameraSelect.bind(this)}>
              {this.state.cameras.map(camera =>
                (this.state.selectedCamera === camera.deviceId)
                  ? <option value={camera.deviceId} selected>{camera.label}</option>
                  : <option value={camera.deviceId}>{camera.label}</option>
              )}
            </select>
          </p>
        </div>
        <p className="centered publish-status-field">STATUS: {this.state.status}</p>
        <div ref={c => this._videoContainer = c}
          id="video-container"
          className="centered">
          <video ref={c => this._red5ProPublisher = c}
            id="red5pro-publisher"
            style={videoStyle}
            controls autoplay disabled></video>
        </div>
      </div>
    )
  }

}

PublisherCameraSourceTest.propTypes = {
  settings: PropTypes.object.isRequired,
  onBackClick: PropTypes.func.isRequired
}

export default PublisherCameraSourceTest
