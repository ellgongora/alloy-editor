import ButtonDropdown from '../buttons/button-dropdown.jsx';
import ButtonIcon from '../buttons/button-icon.jsx';
import React from 'react';

(function() {
	'use strict';

	/* istanbul ignore if */
	if (CKEDITOR.plugins.get('ae_richcombobridge')) {
		return;
	}

	// Some methods like `setState` clash with React's own state methods. For them, unsupported means
	// that we don't account for the different meaning in the passed or returned arguments.
	let UNSUPPORTED_RICHCOMBO_API = {
		// setState: noop,
	};

	let RICH_COMBO_DEFS = {};

	/**
	 * Generates a RichComboBridge React class for a given richcombo definition if it has not been
	 * already created based on the richcombo name and definition.
	 *
	 * @method generateRichComboBridge
	 * @private
	 * @param {String} richComboName The rich combo name
	 * @param {Object} richComboDefinition The rich combo definition
	 * @return {Object} The generated or already existing React RichCombo Class
	 */
	let generateRichComboBridge = function(
		richComboName,
		richComboDefinition,
		editor
	) {
		let RichComboBridge = AlloyEditor.Buttons[richComboName];

		RICH_COMBO_DEFS[editor.name] = RICH_COMBO_DEFS[editor.name] || {};
		RICH_COMBO_DEFS[editor.name][richComboName] =
			RICH_COMBO_DEFS[editor.name][richComboName] || richComboDefinition;
		RICH_COMBO_DEFS[editor.name][richComboName].currentValue = undefined;

		if (!RichComboBridge) {
			RichComboBridge = class extends React.Component {
				static displayName = richComboName;

				static key = richComboName;

				constructor(props) {
					super(props);
					this.state = {
						value:
							RICH_COMBO_DEFS[editor.name][richComboName]
								.currentValue,
					};
				}

				// API not yet implemented inside the richcombo bridge. By mocking the unsupported methods, we
				// prevent plugins from crashing if they make use of them.
				commit() {}
				createPanel() {}
				disable() {}
				enable() {}
				getState() {}
				hideGroup() {}
				hideItem() {}
				mark() {}
				showAll() {}
				startGroup() {}
				unmarkAll() {}

				add(value, preview, title) {
					this._items.push({
						preview: preview,
						title: title,
						value: value,
					});
				}

				componentWillMount() {
					let editor = this.props.editor.get('nativeEditor');

					let editorCombo =
						RICH_COMBO_DEFS[editor.name][richComboName];

					this._items = [];

					this.setValue = this._setValue;

					if (editorCombo.init) {
						editorCombo.init.call(this);
					}

					if (editorCombo.onRender) {
						editorCombo.onRender.call(this);
					}
				}

				componentWillUnmount() {
					this._cacheValue(this.state.value);

					this.setValue = this._cacheValue;
				}

				getValue() {
					return this.state.value;
				}

				render() {
					let editor = this.props.editor.get('nativeEditor');

					let richComboLabel =
						RICH_COMBO_DEFS[editor.name][richComboName]
							.currentValue || richComboDefinition.label;

					return (
						<div className="ae-container-dropdown ae-has-dropdown">
							<button
								aria-expanded={this.props.expanded}
								aria-label={richComboLabel}
								className="ae-toolbar-element"
								onClick={this.props.toggleDropdown}
								role="combobox"
								tabIndex={this.props.tabIndex}
								title={richComboLabel}>
								<div className="ae-container">
									<span className="ae-container-dropdown-selected-item">
										{richComboLabel}
									</span>
									<ButtonIcon
										editor={this.props.editor}
										symbol="caret-bottom"
									/>
								</div>
							</button>
							{this.props.expanded && (
								<ButtonDropdown
									onDismiss={this.props.toggleDropdown}>
									{this._getItems()}
								</ButtonDropdown>
							)}
						</div>
					);
				}

				_cacheValue(value) {
					let editor = this.props.editor.get('nativeEditor');

					RICH_COMBO_DEFS[editor.name][
						richComboName
					].currentValue = value;
				}

				_getItems() {
					let richCombo = this;

					let items = this._items.map(
						function(item) {
							let className =
								'ae-toolbar-element ' +
								(item.value === this.state.value
									? 'active'
									: '');

							return (
								<li key={item.title} role="option">
									<button
										className={className}
										dangerouslySetInnerHTML={{
											__html: item.preview,
										}}
										data-value={item.value}
										onClick={richCombo._onClick}
									/>
								</li>
							);
						}.bind(this)
					);

					return items;
				}

				_onClick = event => {
					let editor = this.props.editor.get('nativeEditor');

					let editorCombo =
						RICH_COMBO_DEFS[editor.name][richComboName];

					if (editorCombo.onClick) {
						let newValue = event.currentTarget.getAttribute(
							'data-value'
						);

						editorCombo.onClick.call(this, newValue);

						RICH_COMBO_DEFS[editor.name][
							richComboName
						].currentValue = newValue;

						editor.fire('actionPerformed', this);
					}
				};

				_setValue(value) {
					this._cacheValue(value);

					this.setState({
						value: value,
					});
				}
			};

			AlloyEditor.Buttons[richComboName] = RichComboBridge;
		}

		return RichComboBridge;
	};

	/* istanbul ignore else */
	if (!CKEDITOR.plugins.get('richcombo')) {
		CKEDITOR.UI_RICHCOMBO = 'richcombo';

		CKEDITOR.plugins.add('richcombo', {});
	}

	/**
	 * CKEditor plugin that bridges the support offered by CKEditor RichCombo plugin. It takes over the
	 * responsibility of registering and creating rich combo elements via:
	 * - editor.ui.addRichCombo(name, definition)
	 * - editor.ui.add(name, CKEDITOR.UI_RICHCOMBO, definition)
	 *
	 * @class CKEDITOR.plugins.ae_richcombobridge
	 * @requires CKEDITOR.plugins.ae_uibridge
	 * @constructor
	 */
	CKEDITOR.plugins.add('ae_richcombobridge', {
		requires: ['ae_uibridge'],

		/**
		 * Set the add handler for UI_RICHCOMBO to our own. We do this in the init phase to override
		 * the one in the original plugin in case it's present
		 *
		 * @method init
		 * @param {Object} editor The CKEditor instance being initialized
		 */
		beforeInit: function(editor) {
			editor.ui.addRichCombo = function(
				richComboName,
				richComboDefinition
			) {
				this.add(
					richComboName,
					CKEDITOR.UI_RICHCOMBO,
					richComboDefinition
				);
			};

			editor.ui.addHandler(CKEDITOR.UI_RICHCOMBO, {
				add: generateRichComboBridge,
				create: function(richComboDefinition) {
					let richComboName =
						'richComboBridge' + ((Math.random() * 1e9) >>> 0);
					let RichComboBridge = generateRichComboBridge(
						richComboName,
						richComboDefinition
					);

					return new RichComboBridge();
				},
			});
		},
	});
})();