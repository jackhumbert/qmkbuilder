const React = require('react');

const Keyboard = require('state/keyboard');

const C = require('const');
const Utils = require('utils');

const Request = require('superagent');

class Main extends React.Component {

	constructor(props) {
		super(props);

		// Bind functions.
		this.upload = this.upload.bind(this);
		this.useKLE = this.useKLE.bind(this);
		this.usePreset = this.usePreset.bind(this);
		this.loadPresets = this.loadPresets.bind(this);

		this.loadPresets();
	}

	/*
	 * Upload a QMK Builder configuration.
	 */
	upload() {
		const state = this.props.state;

		// Upload a file.
		Utils.readFile(contents => {
			try {
				// Deserialize the contents.
				const deserialized = JSON.parse(contents);

				// Ensure the version is correct.
				if (deserialized.version !== C.VERSION) throw 'version mismatch';

				// Build a new keyboard.
				const keyboard = Keyboard.deserialize(state, deserialized.keyboard);

				state.update({
					keyboard: keyboard,
					screen: C.SCREEN_WIRING // Switch to the wiring screen.
				});
			} catch (e) {
				console.error(e);
				state.error('Invalid configuration');
			}
		});
	}

	/*
	 * Use KLE raw data.
	 */
	useKLE() {
		const state = this.props.state;

		try {
			const json = parser.parse('[' + state.ui.get('kle', '') + ']'); // Parse the raw data.

			// Parse the KLE data.
			const keyboard = new Keyboard(state, json);

			// Make sure the data is valid.
			if (keyboard.keys.length == 0) {
				throw 'empty layout';
			}

			state.update({
				keyboard: keyboard,
				screen: C.SCREEN_WIRING // Switch to the wiring screen.
			});
		} catch (e) {
			console.error(e);
			state.error('Invalid layout');
		}
	}

	/*
	 * Use a preset.
	 *
	 * @param {String} id The id of the preset.
	 */
	usePreset(id) {
		const state = this.props.state;

		Request
			.get(C.LOCAL.PRESETS + id + '.json')
			.end((err, res) => {
				if (err) return state.error('Unable to load preset.');

				try {
					// Deserialize the contents.
					const deserialized = JSON.parse(res.text);

					// Ensure the version is correct.
					if (deserialized.version !== C.VERSION) throw 'version mismatch';

					// Build a new keyboard.
					const keyboard = Keyboard.deserialize(state, deserialized.keyboard);

					state.update({
						keyboard: keyboard,
						screen: C.SCREEN_KEYMAP // Switch to the keymap screen.
					});
				} catch (e) {
					console.error(e);
					state.error('Invalid configuration');
				}
			});
	}

	loadPresets() {
		const state = this.props.state;
		
		Request
			.get("http://qmk.fm/keyboards.json")
			.end((err, res) => {
				if (err) return state.error('Unable to load presets: ' + err);

				try {
					const keyboards = JSON.parse(res.text);
					const presets = state.presets;
					for (var i = 0; i < keyboards.length; i++ ) {
						presets[keyboards[i].shortname] = keyboards[i].name;
					}
					state.update({
						presets: presets,
						screen: C.SCREEN_MAIN
					});
					this.forceUpdate();
				} catch (e) {
					console.error(e);
					state.error('Error retriving keyboards.json');
				}
			});
	}

	render() {
		const state = this.props.state;
		const presets = state.presets;

		return <div>
			<h3>Upload Keyboard Firmware Builder configuration</h3>
			<button
				className='block'
				onClick={ this.upload }>
				Upload
			</button>
			<br/><br/>
			<h3>Or import from keyboard-layout-editor.com</h3>
			<textarea
				className='kle'
				placeholder='Paste layout here...'
				value={ state.ui.get('kle', '') }
				onChange={ state.ui.set('kle') }/>
			<button
				className='block'
				onClick={ this.useKLE }>
				Import
			</button>
			<br/><br/>
			<h3>Or choose a preset layout</h3>
			<div id="presets">
			{(() => {
				const presets_buttons = [];
				for (const preset in presets) {
					presets_buttons.push(<button
						className='light block'
						onClick={ () => this.usePreset(preset) }
						key={ preset }>
						{ presets[preset] }
					</button>);
					presets_buttons.push(<div style={{ height: '0.5rem' }} key={ '-key-' + preset }/>);
				}
				return presets_buttons;
			})()}
			</div>
		</div>;
	}

}

module.exports = Main;
