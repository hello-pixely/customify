(
	function( $, exports, wp ) {
		var api = wp.customize;
		var $window = $( window );

		// when the customizer is ready prepare our fields events
		wp.customize.bind( 'ready', function() {
			var timeout = null;

			// add ace editors
			$( '.customify_ace_editor' ).each( function( key, el ) {
				var id = $( this ).attr( 'id' ),
					css_editor = ace.edit( id );

				var editor_type = $( this ).data( 'editor_type' );
				// init the ace editor
				css_editor.setTheme( "ace/theme/github" );
				css_editor.getSession().setMode( "ace/mode/" + editor_type );

				// hide the textarea and enable the ace editor
				var textarea = $( '#' + id + '_textarea' ).hide();
				css_editor.getSession().setValue( textarea.val() );

				// each time a change is triggered start a timeout of 1,5s and when is finished refresh the previewer
				// if the user types faster than this delay then reset it
				css_editor.getSession().on( 'change', function( e ) {
					if ( timeout !== null ) {
						clearTimeout( timeout );
						timeout = null;
					} else {
						timeout = setTimeout( function() {
							//var state = css_editor.session.getState();
							textarea.val( css_editor.getSession().getValue() );
							textarea.trigger( 'change' );
						}, 1500 );
					}
				} );
			} );

			// simple select2 field
			$( '.customify_select2' ).select2();

			setTimeout( function() {
				customifyFontSelect.init( this );
			}, 333 );

			prepare_typography_field();

			/**
			 * Make the customizer save on CMD/CTRL+S action
			 * This is awesome!!!
			 */
			$( window ).bind( 'keydown', function( event ) {
				if ( event.ctrlKey || event.metaKey ) {
					switch ( String.fromCharCode( event.which ).toLowerCase() ) {
						case 's':
							event.preventDefault();
							api.previewer.save();
							break;
					}
				}
			} );

			// for each range input add a value preview output
			$( '.accordion-section-content[id*="' + customify_settings.options_name + '"]' ).each( function() {

				// Initialize range fields logic
				customifyHandleRangeFields( this );
			} );

			if ( $( 'button[data-action="reset_customify"]' ).length > 0 ) {
				// reset_button
				$( document ).on( 'click', '#customize-control-reset_customify button', function( ev ) {
					ev.preventDefault();

					var iAgree = confirm( 'Do you really want to reset to defaults all the fields? Watch out, this will reset all your Customify options and will save them!' );

					if ( ! iAgree ) {
						return;
					}

					$.each( api.settings.controls, function( key, ctrl ) {
						var setting_id = key.replace( '_control', '' );
						var setting = customify_settings.settings[setting_id];

						if ( ! _.isUndefined( setting ) && ! _.isUndefined( setting.default ) ) {
							api_set_setting_value( setting_id, setting.default );
						}
					} );

					api.previewer.save();
				} );

				// add a reset button for each panel
				$( '.panel-meta' ).each( function( el, key ) {
					var container = $( this ).parents( '.control-panel' ),
						id = container.attr( 'id' );

					if ( typeof id !== 'undefined' ) {
						var panel_id = id.replace( 'accordion-panel-', '' );
						$( this ).parent().append( '<button class="reset_panel button" data-panel="' + panel_id + '">Panel\'s defaults</button>' );
					}
				} );

				// reset panel
				$( document ).on( 'click', '.reset_panel', function( e ) {
					e.preventDefault();

					var panel_id = $( this ).data( 'panel' ),
						panel = api.panel( panel_id ),
						sections = panel.sections(),
						iAgree = confirm( "Do you really want to reset " + panel.params.title + "?" );

					if ( ! iAgree ) {
						return;
					}
					if ( sections.length > 0 ) {
						$.each( sections, function() {
							//var settings = this.settings();
							var controls = this.controls();

							if ( controls.length > 0 ) {
								$.each( controls, function( key, ctrl ) {
									var setting_id = ctrl.id.replace( '_control', '' ),
										setting = customify_settings.settings[setting_id];

									if ( ! _.isUndefined( setting ) && ! _.isUndefined( setting.default ) ) {
										api_set_setting_value( setting_id, setting.default );
									}
								} );
							}
						} );
					}
				} );

				//add reset section
				$( '.accordion-section-content' ).each( function( el, key ) {
					var section_id = $( this ).attr( 'id' );

					if ( (
						     (
							     ! _.isUndefined( section_id )
						     ) ? section_id.indexOf( customify_settings.options_name ) : - 1
					     ) === - 1 ) {
						return;
					}

					if ( ! _.isUndefined( section_id ) && section_id.indexOf( 'sub-accordion-section-' ) > - 1 ) {
						var id = section_id.replace( 'sub-accordion-section-', '' );
						$( this ).append( '<button class="reset_section button" data-section="' + id + '">Reset All Options for This Section</button>' );
					}
				} );

				// reset section event
				$( document ).on( 'click', '.reset_section', function( e ) {
					e.preventDefault();

					var section_id = $( this ).data( 'section' ),
						section = api.section( section_id ),
						controls = section.controls();

					var iAgree = confirm( "Do you really want to reset " + section.params.title + "?" );

					if ( ! iAgree ) {
						return;
					}

					if ( controls.length > 0 ) {
						$.each( controls, function( key, ctrl ) {
							var setting_id = ctrl.id.replace( '_control', '' ),
								setting = customify_settings.settings[setting_id];

							if ( ! _.isUndefined( setting ) && ! _.isUndefined( setting.default ) ) {
								api_set_setting_value( setting_id, setting.default );
							}
						} );
					}
				} );
			}

			$( document ).on( 'change keyup', '.customize-control-range input.range-value', function() {
				var range = $( this ).siblings( 'input[type="range"]' );
				range.val( $( this ).val() );
				range.trigger( 'change' );
			} );

			$( document ).on( 'change', '.customify_typography_font_subsets', function( ev ) {

				var $input = $( this ).parents( '.options' ).siblings( '.customify_typography' ).children( '.customify_typography_values' ),
					current_val = $input.val();

				current_val = JSON.parse( decodeURIComponent( current_val ) );

				//maybe the selected option holds a JSON in its value
				current_val.selected_subsets = maybeJsonParse( $( this ).val() );

				$input.val( encodeURIComponent( JSON.stringify( current_val ) ) );

				$input.trigger( 'change' );
			} );

			$( document ).on( 'change', '.customify_typography_font_weight', function( ev ) {

				var $input = $( this ).parents( '.options' ).siblings( '.customify_typography' ).children( '.customify_typography_values' ),
					current_val = $input.val();

				current_val = maybeJsonParse( current_val );
				// @todo currently the font weight selector works for one value only
				// maybe make this a multiselect

				//maybe the selected option holds a JSON in its value
				current_val.selected_variants = {0: maybeJsonParse( $( this ).val() )};

				$input.val( encodeURIComponent( JSON.stringify( current_val ) ) );
				$input.trigger( 'change' );
			} );

			$( 'body' ).on( 'customify:preset-change', function( e ) {
				const data = $( e.target ).data( 'options' );

				if ( ! _.isUndefined( data ) ) {
					$.each( data, function( setting_id, value ) {
						api_set_setting_value( setting_id, value );
					} );
				}
			} );

			$( document ).on( 'change', '.customify_preset.select', function() {
				const $source = $( this );
				const $target = $source.children( '[value="' + $source.val() + '"]' );
				$target.trigger( 'customify:preset-change' );
			} );

			$( document ).on( 'click', '.customify_preset.radio input, .customify_preset.radio_buttons input, .awesome_presets input', function() {
				$( this ).trigger( 'customify:preset-change' );
			} );

			// bind our event on click
			$( document ).on( 'click', '.customify_import_demo_data_button', function( event ) {
				let key = $( this ).data( 'key' );
				let import_queue = new Queue( api );
				let steps = [];

				if ( ! _.isUndefined( customify_settings.settings[key].imports ) ) {

					$.each( customify_settings.settings[key].imports, function( i, import_setts, k ) {
						if ( _.isUndefined( import_setts.steps ) ) {
							steps.push( {id: i, type: import_setts.type} );
						} else {
							var count = import_setts.steps;

							while ( count >= 1 ) {
								steps.push( {id: i, type: import_setts.type, count: count} );
								count = count - 1;
							}
						}
					} );
				}

				import_queue.add_steps( 'import_demo_data_action_id', steps );
				return false;
			} );

			customifyBackgroundJsControl.init();

			// sometimes a php save may be needed
			if ( getUrlVars( 'save_customizer_once' ) ) {
				api.previewer.save();
			}

			setTimeout( function() {
				customifyFoldingFields();
			}, 1000 );


			// Handle the section tabs (ex: Layout | Fonts | Colors)
			(
				function() {
					var $navs = $( '.js-section-navigation' );

					$navs.each( function() {
						var $nav = $( this );
						var $title = $nav.parents( '.accordion-section-content' ).find( '.customize-section-title' );

						$nav.closest( '.customize-control' ).addClass( 'screen-reader-text' );
						$title.append( $nav ).parent().addClass( 'has-nav' );
					} );

					$( '.js-section-navigation a' ).on( 'click', function( e ) {
						e.preventDefault();

						var $sidebar = $( this ).parents( '.customize-pane-child' );
						var $parent = $( this ).parents( '.accordion-section-content' );
						var href = $.attr( this, 'href' );

						if ( href != '#' ) {
							$sidebar.animate( {
								scrollTop: $( $.attr( this, 'href' ) ).position().top - $parent.find( '.customize-section-title' ).outerHeight()
							}, 500 );
						}
					} );
				}
			)();

			(
				function() {
					// Close a font field when clicking on another field
					$( '.customify_font_tooltip' ).on( 'click', function() {
						if ( $( this ).prop( 'checked' ) === true ) {
							$( '.customify_font_tooltip' ).prop( 'checked', false );
							$( this ).prop( 'checked', true );
						}
					} );
				}
			)();

			// Handle the Style Manager user feedback logic.
            var $styleManagerUserFeedbackModal = $('#style-manager-user-feedback-modal');
            if ( $styleManagerUserFeedbackModal.length ) {
                var $styleManagerUserFeedbackForm = $styleManagerUserFeedbackModal.find('form'),
                    $styleManagerUserFeedbackCloseBtn = $styleManagerUserFeedbackModal.find('.close'),
                    $styleManagerUserFeedbackFirstStep = $styleManagerUserFeedbackModal.find('.first-step'),
                    $styleManagerUserFeedbackSecondStep = $styleManagerUserFeedbackModal.find('.second-step'),
                    $styleManagerUserFeedbackThanksStep = $styleManagerUserFeedbackModal.find('.thanks-step'),
                    $styleManagerUserFeedbackErrorStep = $styleManagerUserFeedbackModal.find('.error-step'),
                    styleManagerUserFeedbackModalShown = false,
                    styleManagerColorPaletteChanged = false;

                // Handle when to open the modal.
                api.bind('saved', function () {
                    // We will only show the modal once per Customizer session.
                    if (!styleManagerUserFeedbackModalShown && styleManagerColorPaletteChanged) {
                        $('body').addClass('modal-open');
                        styleManagerUserFeedbackModalShown = true;
                    }
                });

                // Handle the color palette changed info update.
                const colorPaletteSetting = api( 'sm_color_palette' );
                if ( !_.isUndefined(colorPaletteSetting) ) {
                    colorPaletteSetting.bind( function( new_value, old_value ) {
                        if ( new_value != old_value ) {
                            styleManagerColorPaletteChanged = true;
                        }
                    } )
                }
                const colorPaletteVariationSetting = api( 'sm_color_palette_variation' );
                if ( !_.isUndefined(colorPaletteVariationSetting) ) {
                    colorPaletteVariationSetting.bind( function( new_value, old_value ) {
                        if ( new_value != old_value ) {
                            styleManagerColorPaletteChanged = true;
                        }
                    } )
                }

                // Handle the modal submit.
                $styleManagerUserFeedbackForm.on('submit', function (event) {
                    event.preventDefault();

                    let $form = $(event.target);

                    let data = {
                        action: 'customify_style_manager_user_feedback',
                        nonce: customify_settings.style_manager_user_feedback_nonce,
                        type: $form.find('input[name=type]').val(),
                        rating: $form.find('input[name=rating]:checked').val(),
                        message: $form.find('textarea[name=message]').val()
                    };

                    $.post(
                        customify_settings.ajax_url,
                        data,
                        function (response) {
                            if (true === response.success) {
                                $styleManagerUserFeedbackFirstStep.hide();
                                $styleManagerUserFeedbackSecondStep.hide();
                                $styleManagerUserFeedbackThanksStep.show();
                                $styleManagerUserFeedbackErrorStep.hide();
                            } else {
                                $styleManagerUserFeedbackFirstStep.hide();
                                $styleManagerUserFeedbackSecondStep.hide();
                                $styleManagerUserFeedbackThanksStep.hide();
                                $styleManagerUserFeedbackErrorStep.show();
                            }
                        }
                    );
                });

                $styleManagerUserFeedbackForm.find('input[name=rating]').on('change', function (event) {
                    // Leave everything in working order
                    setTimeout(function () {
                        $styleManagerUserFeedbackSecondStep.show();
                    }, 300);

                    let rating = $styleManagerUserFeedbackForm.find('input[name=rating]:checked').val();

                    $styleManagerUserFeedbackForm.find('.rating-placeholder').text(rating);
                });

                $styleManagerUserFeedbackCloseBtn.on('click', function (event) {
                    event.preventDefault();

                    $('body').removeClass('modal-open');

                    // Leave everything in working order
                    setTimeout(function () {
                        $styleManagerUserFeedbackFirstStep.show();
                        $styleManagerUserFeedbackSecondStep.hide();
                        $styleManagerUserFeedbackThanksStep.hide();
                        $styleManagerUserFeedbackErrorStep.hide();
                    }, 300);
                });
            }
		} );

		const customifyHandleRangeFields = function( el ) {

			// For each range input add a number field (for preview mainly - but it can also be used for input)
			$( el ).find( 'input[type="range"]' ).each( function() {
				if ( ! $( this ).siblings( '.range-value' ).length ) {
					var $clone = $( this ).clone();

					$clone
					.attr( 'type', 'number' )
					.attr( 'class', 'range-value' )
					.removeAttr( 'data-field' );

					$( this ).after( $clone );
				}

				// Update the number field when changing the range
				$( this ).on( 'change', function() {
					$( this ).siblings( '.range-value' ).val( $( this ).val() );
				} );

				// And the other way around, update the range field when changing the number
				$( $clone ).on( 'change', function() {
					$( this ).siblings( 'input[type="range"]' ).val( $( this ).val() );
				} );
			} );
		};

		/**
		 * This function will search for all the interdependend fields and make a bound between them.
		 * So whenever a target is changed, it will take actions to the dependent fields.
		 * @TODO  this is still written in a barbaric way, refactor when needed
		 */
		var customifyFoldingFields = function() {

			if ( _.isUndefined( customify_settings ) || _.isUndefined( customify_settings.settings ) ) {
				return; // bail
			}

			/**
			 * Let's iterate through all the customify settings and gather all the fields that have a "show_if"
			 * property set.
			 *
			 * At the end `targets` will hold a list of [ target : [field, field,...], ... ]
			 * so when a target is changed we will change all the fields.
			 */
			var targets = {};

			$.fn.reactor.defaults.compliant = function() {
				$( this ).slideDown();
				// $(this).animate({opacity: 1});
				$( this ).find( ':disabled' ).attr( {disabled: false} );
			};

			$.fn.reactor.defaults.uncompliant = function() {
				$( this ).slideUp();
				// $(this).animate({opacity: 0.25});
				$( this ).find( ':enabled' ).attr( {disabled: true} );
			};

			var IS = $.extend( {}, $.fn.reactor.helpers );

			var bind_folding_events = function( parent_id, field, relation ) {

				var key = null;

				if ( _.isString( field ) ) {
					key = field;
				} else if ( ! _.isUndefined( field.id ) ) {
					key = field.id;
				} else if ( isString( field[0] ) ) {
					key = field[0];
				} else {
					return; // no key, no fun
				}

				var value = 1, // by default we use 1 the most used value for checkboxes or inputs
					compare = '==', // ... ye
					action = "show",
					between = [0, 1]; // can only be `show` or `hide`

				var target_key = customify_settings.options_name + '[' + key + ']';

				var target_type = customify_settings.settings[target_key].type;

				// we support the usual syntax like a config array like `array( 'id' => $id, 'value' => $value, 'compare' => $compare )`
				// but we also support a non-associative array like `array( $id, $value, $compare )`
				if ( ! _.isUndefined( field.value ) ) {
					value = field.value;
				} else if ( ! _.isUndefined( field[1] ) && ! _.isString( field[1] ) ) {
					value = field[1];
				}

				if ( ! _.isUndefined( field.compare ) ) {
					compare = field.compare;
				} else if ( ! _.isUndefined( field[2] ) ) {
					compare = field[2];
				}

				if ( ! _.isUndefined( field.action ) ) {
					action = field.action;
				} else if ( ! _.isUndefined( field[3] ) ) {
					action = field[3];
				}

				// a field can also overwrite the parent relation
				if ( ! _.isUndefined( field.relation ) ) {
					action = field.relation;
				} else if ( ! _.isUndefined( field[4] ) ) {
					action = field[4];
				}

				if ( ! _.isUndefined( field.between ) ) {
					between = field.between;
				}

				/**
				 * Now for each target we have, we will bind a change event to hide or show the dependent fields
				 */
				var target_selector = '[data-customize-setting-link="' + customify_settings.options_name + '[' + key + ']"]';

				switch ( target_type ) {
					case 'checkbox':
						$( parent_id ).reactIf( target_selector, function() {
							return $( this ).is( ':checked' ) == value;
						} );
						break;

					case 'radio':
					case 'radio_image':

						// in case of an array of values we use the ( val in array) condition
						if ( _.isObject( value ) ) {
							$( parent_id ).reactIf( target_selector, function() {
								return (
									value.indexOf( $( target_selector + ':checked' ).val() ) !== - 1
								);
							} );
						} else { // in any other case we use a simple == comparison
							$( parent_id ).reactIf( target_selector, function() {
								return $( target_selector + ':checked' ).val() == value;
							} );
						}
						break;

					case 'range':
						var x = IS.Between( between[0], between[1] );

						$( parent_id ).reactIf( target_selector, x );
						break;

					default:
						// in case of an array of values we use the ( val in array) condition
						if ( _.isObject( value ) ) {
							$( parent_id ).reactIf( target_selector, function() {
								return (
									value.indexOf( $( target_selector ).val() ) !== - 1
								);
							} );
						} else { // in any other case we use a simple == comparison
							$( parent_id ).reactIf( target_selector, function() {
								return $( target_selector ).val() == value;
							} );
						}
						break;
				}

				$( target_selector ).trigger( 'change' );
				$( '.reactor' ).trigger( 'change.reactor' ); // triggers all events on load
			};

			$.each( customify_settings.settings, function( id, field ) {
				/**
				 * Here we have the id of the fields. but we know for sure that we just need his parent selector
				 * So we just create it
				 */
				var parent_id = id.replace( '[', '-' );
				parent_id = parent_id.replace( ']', '' );
				parent_id = '#customize-control-' + parent_id + '_control';

				// get only the fields that have a 'show_if' property
				if ( field.hasOwnProperty( 'show_if' ) ) {
					var relation = 'AND';

					if ( ! _.isUndefined( field.show_if.relation ) ) {
						relation = field.show_if.relation;
						// remove the relation property, we need the config to be array based only
						delete field.show_if.relation;
					}

					/**
					 * The 'show_if' can be a simple array with one target like: [ id, value, comparison, action ]
					 * Or it could be an array of multiple targets and we need to process both cases
					 */

					if ( ! _.isUndefined( field.show_if.id ) ) {
						bind_folding_events( parent_id, field.show_if, relation );
					} else if ( _.isObject( field.show_if ) ) {
						$.each( field.show_if, function( i, j ) {
							bind_folding_events( parent_id, j, relation );
						} );
					}
				}
			} );
		};

		var get_typography_font_family = function( $el ) {

			var font_family_value = $el.val();
			// first time this will not be a json so catch that error
			try {
				font_family_value = JSON.parse( font_family_value );
			} catch ( e ) {
				return {font_family: font_family_value};
			}

			if ( ! _.isUndefined( font_family_value.font_family ) ) {
				return font_family_value.font_family;
			}

			return false;
		};

		// get each typography field and bind events
		// @todo Are we still using the typography field since we have the font field?
		var prepare_typography_field = function() {

			var $typos = $( '.customify_typography_font_family' );

			$typos.each( function() {
				var font_family_select = this,
					$input = $( font_family_select ).siblings( '.customify_typography_values' );
				// on change
				$( font_family_select ).on( 'change', function() {
					update_siblings_selects( font_family_select );
					$input.trigger( 'change' );
				} );
				update_siblings_selects( font_family_select );
			} );
		};

		var api_set_setting_value = function( setting_id, value ) {
			let setting = api( setting_id ),
				field = $( '[data-customize-setting-link="' + setting_id + '"]' ),
				field_class = $( field ).parent().attr( 'class' );

			// Legacy field type
			if ( ! _.isUndefined( field_class ) && field_class === 'customify_typography' ) {

				let family_select = field.siblings( 'select' );

				if ( _.isString( value ) ) {
					let this_option = family_select.find( 'option[value="' + value + '"]' );
					$( this_option[0] ).attr( 'selected', 'selected' );
					update_siblings_selects( family_select );
				} else if ( _.isObject( value ) ) {
					let this_family_option = family_select.find( 'option[value="' + value['font_family'] + '"]' );

					$( this_family_option[0] ).attr( 'selected', 'selected' );

					update_siblings_selects( this_family_option );

					setTimeout( function() {
						let weight_select = field.parent().siblings( '.options' ).find( '.customify_typography_font_weight' ),
							this_weight_option = weight_select.find( 'option[value="' + value['selected_variants'] + '"]' );

						$( this_weight_option[0] ).attr( 'selected', 'selected' );

						update_siblings_selects( this_family_option );

						weight_select.trigger( 'change' );
					}, 300 );
				}

				family_select.trigger( 'change' );

			} else if ( ! _.isUndefined( field_class ) && field_class === 'font-options__wrapper' ) {

				// if the value is a simple string it must be the font family
				if ( _.isString( value ) ) {
					let option = field.parent().find( 'option[value="' + value + '"]' );

					option.attr( 'selected', 'selected' );
					// option.parents('select').trigger('change');
				} else if ( _.isObject( value ) ) {
					// Find the options list wrapper
					let optionsList = field.parent().children( '.font-options__options-list' );

					if ( optionsList.length ) {
						// We will process each font property and update it
						_.each( value, function( val, key ) {
							// We need to map the keys to the data attributes we are using - I know :(
							let mappedKey = key;
							switch ( key ) {
								case 'font-family':
									mappedKey = 'font_family';
									break;
								case 'font-size':
									mappedKey = 'font_size';
									break;
								case 'font-weight':
									mappedKey = 'selected_variants';
									break;
								case 'letter-spacing':
									mappedKey = 'letter_spacing';
									break;
								case 'text-transform':
									mappedKey = 'text_transform';
									break;
								default:
									break;
							}
							let subField = optionsList.find( '[data-field="' + mappedKey + '"]' );
							if ( subField.length ) {
								subField.val( val );
								subField.trigger( 'change' );
							}
						} );
					}
				}

			} else {
				setting.set( value );
			}
		};

		var update_siblings_selects = function( font_select ) {
			var selected_font = $( font_select ).val(),
				$input = $( font_select ).siblings( '.customify_typography_values' ),
				current_val = $input.attr( 'value' );

			if ( current_val === '[object Object]' ) {
				current_val = $input.data( 'default' );
			} else if ( _.isString( current_val ) && ! isJsonString( current_val ) && current_val.substr( 0, 1 ) == '[' ) {
				// a rare case when the value isn't a json but is a representative string like [family,weight]
				current_val = current_val.split( ',' );
				var new_current_value = {};
				if ( ! _.isUndefined( current_val[0] ) ) {
					new_current_value['font_family'] = current_val[0];
				}

				if ( ! _.isUndefined( current_val[1] ) ) {
					new_current_value['selected_variants'] = current_val[1];
				}

				current_val = JSON.stringify( new_current_value );
			}

			var $font_weight = $( font_select ).parent().siblings( 'ul.options' ).find( '.customify_typography_font_weight' ),
				$font_subsets = $( font_select ).parent().siblings( 'ul.options' ).find( '.customify_typography_font_subsets' );

			try {
				current_val = JSON.parse( decodeURIComponent( current_val ) );
			} catch ( e ) {

				// in case of an error, force the rebuild of the json
				if ( _.isUndefined( $( font_select ).data( 'bound_once' ) ) ) {

					$( font_select ).data( 'bound_once', true );

					$( font_select ).change();
					$font_weight.change();
					$font_subsets.change();
				}
			}

			// first try to get the font from sure sources, not from the recommended list.
			var option_data = $( font_select ).find( ':not(optgroup[label=Recommended]) option[value="' + selected_font + '"]' );
			// however, if there isn't an option found, get what you can
			if ( option_data.length < 1 ) {
				option_data = $( font_select ).find( 'option[value="' + selected_font + '"]' );
			}

			if ( option_data.length > 0 ) {

				var font_type = option_data.data( 'type' ),
					value_to_add = {'type': font_type, 'font_family': selected_font},
					variants = null,
					subsets = null;

				if ( font_type == 'std' ) {
					variants = {
						0: '100',
						1: '200',
						3: '300',
						4: '400',
						5: '500',
						6: '600',
						7: '700',
						8: '800',
						9: '900'
					};
					if ( ! _.isUndefined( $( option_data[0] ).data( 'variants' ) ) ) {
						//maybe the variants are a JSON
						variants = maybeJsonParse( $( option_data[0] ).data( 'variants' ) );
					}
				} else {
					//maybe the variants are a JSON
					variants = maybeJsonParse( $( option_data[0] ).data( 'variants' ) );

					//maybe the subsets are a JSON
					subsets = maybeJsonParse( $( option_data[0] ).data( 'subsets' ) );
				}

				// make the variants selector
				if ( ! _.isUndefined( variants ) && ! _.isNull( variants ) && ! _.isEmpty( variants ) ) {

					value_to_add['variants'] = variants;
					// when a font is selected force the first weight to load
					value_to_add['selected_variants'] = {0: variants[0]};

					var variants_options = '',
						count_weights = 0;

					if ( _.isArray( variants ) || _.isObject( variants ) ) {
						// Take each variant and produce the option markup
						$.each( variants, function( key, el ) {
							var is_selected = '';
							if ( _.isObject( current_val.selected_variants ) && inObject( el, current_val.selected_variants ) ) {
								is_selected = ' selected="selected"';
							} else if ( _.isString( current_val.selected_variants ) && el === current_val.selected_variants ) {
								is_selected = ' selected="selected"';
							}

							// initialize
							var variant_option_value = el,
								variant_option_display = el;

							// If we are dealing with a object variant then it means things get tricky (probably it's our fault but bear with us)
							// This probably comes from our Fonto plugin - a font with individually named variants - hence each has its own font-family
							if ( _.isObject( el ) ) {
								//put the entire object in the variation value - we will need it when outputting the custom CSS
								variant_option_value = encodeURIComponent( JSON.stringify( el ) );
								variant_option_display = '';

								//if we have weight and style then "compose" them into something standard
								if ( ! _.isUndefined( el['font-weight'] ) ) {
									variant_option_display += el['font-weight'];
								}

								if ( _.isString( el['font-style'] ) && $.inArray( el['font-style'].toLowerCase(), [
										"normal",
										"regular"
									] ) < 0 ) { //this comparison means it hasn't been found
									variant_option_display += el['font-style'];
								}
							}

							variants_options += '<option value="' + variant_option_value + '"' + is_selected + '>' + variant_option_display + '</option>';
							count_weights ++;
						} );
					}

					if ( ! _.isUndefined( $font_weight ) ) {
						$font_weight.html( variants_options );
						// if there is no weight or just 1 we hide the weight select ... cuz is useless
						if ( $( font_select ).data( 'load_all_weights' ) === true || count_weights <= 1 ) {
							$font_weight.parent().css( 'display', 'none' );
						} else {
							$font_weight.parent().css( 'display', 'inline-block' );
						}
					}
				} else if ( ! _.isUndefined( $font_weight ) ) {
					$font_weight.parent().css( 'display', 'none' );
				}

				// make the subsets selector
				if ( ! _.isUndefined( subsets ) && ! _.isNull( subsets ) && ! _.isEmpty( subsets ) ) {

					value_to_add['subsets'] = subsets;
					// when a font is selected force the first subset to load
					value_to_add['selected_subsets'] = {0: subsets[0]};
					var subsets_options = '',
						count_subsets = 0;
					$.each( subsets, function( key, el ) {
						var is_selected = '';
						if ( _.isObject( current_val.selected_subsets ) && inObject( el, current_val.selected_subsets ) ) {
							is_selected = ' selected="selected"';
						}

						subsets_options += '<option value="' + el + '"' + is_selected + '>' + el + '</option>';
						count_subsets ++;
					} );

					if ( ! _.isUndefined( $font_subsets ) ) {
						$font_subsets.html( subsets_options );

						// if there is no subset or just 1 we hide the subsets select ... cuz is useless
						if ( count_subsets <= 1 ) {
							$font_subsets.parent().css( 'display', 'none' );
						} else {
							$font_subsets.parent().css( 'display', 'inline-block' );
						}
					}
				} else if ( ! _.isUndefined( $font_subsets ) ) {
					$font_subsets.parent().css( 'display', 'none' );
				}

				$input.val( encodeURIComponent( JSON.stringify( value_to_add ) ) );
			}
		};

		/** Modules **/

		var customifyBackgroundJsControl = (
			function() {
				"use strict";

				function init() {
					// Remove the image button
					$( '.customize-control-custom_background .remove-image, .customize-control-custom_background .remove-file' ).unbind( 'click' ).on( 'click', function( e ) {
						removeImage( $( this ).parents( '.customize-control-custom_background:first' ) );
						preview( $( this ) );
						return false;
					} );

					// Upload media button
					$( '.customize-control-custom_background .background_upload_button' ).unbind().on( 'click', function( event ) {
						addImage( event, $( this ).parents( '.customize-control-custom_background:first' ) );
					} );

					$( '.customify_background_select' ).on( 'change', function() {
						preview( $( this ) );
					} );
				}

				// Add a file via the wp.media function
				function addImage( event, selector ) {

					event.preventDefault();

					var frame;
					var jQueryel = jQuery( this );

					// If the media frame already exists, reopen it.
					if ( frame ) {
						frame.open();
						return;
					}

					// Create the media frame.
					frame = wp.media( {
						multiple: false,
						library: {
							//type: 'image' //Only allow images
						},
						// Set the title of the modal.
						title: jQueryel.data( 'choose' ),

						// Customize the submit button.
						button: {
							// Set the text of the button.
							text: jQueryel.data( 'update' )
							// Tell the button not to close the modal, since we're
							// going to refresh the page when the image is selected.
						}
					} );

					// When an image is selected, run a callback.
					frame.on( 'select', function() {
						// Grab the selected attachment.
						var attachment = frame.state().get( 'selection' ).first();
						frame.close();

						if ( attachment.attributes.type !== "image" ) {
							return;
						}

						selector.find( '.upload' ).attr( 'value', attachment.attributes.url );
						selector.find( '.upload-id' ).attr( 'value', attachment.attributes.id );
						selector.find( '.upload-height' ).attr( 'value', attachment.attributes.height );
						selector.find( '.upload-width' ).attr( 'value', attachment.attributes.width );

						var thumbSrc = attachment.attributes.url;
						if ( ! _.isUndefined( attachment.attributes.sizes ) && ! _.isUndefined( attachment.attributes.sizes.thumbnail ) ) {
							thumbSrc = attachment.attributes.sizes.thumbnail.url;
						} else if ( ! _.isUndefined( attachment.attributes.sizes ) ) {
							var height = attachment.attributes.height;
							for ( var key in attachment.attributes.sizes ) {
								var object = attachment.attributes.sizes[key];
								if ( object.height < height ) {
									height = object.height;
									thumbSrc = object.url;
								}
							}
						} else {
							thumbSrc = attachment.attributes.icon;
						}

						selector.find( '.customify_background_input.background-image' ).val( attachment.attributes.url );

						if ( ! selector.find( '.upload' ).hasClass( 'noPreview' ) ) {
							selector.find( '.preview_screenshot' ).empty().hide().append( '<img class="preview_image" src="' + thumbSrc + '">' ).slideDown( 'fast' );
						}
						//selector.find('.media_upload_button').unbind();
						selector.find( '.remove-image' ).removeClass( 'hide' );//show "Remove" button
						selector.find( '.customify_background_select' ).removeClass( 'hide' );//show "Remove" button

						preview( selector );
					} );

					// Finally, open the modal.
					frame.open();
				}

				// Update the background preview
				function preview( selector ) {

					var $parent = selector.parents( '.customize-control-custom_background:first' );

					if ( selector.hasClass( 'customize-control-custom_background' ) ) {
						$parent = selector;
					}

					if ( $parent.length > 0 ) {
						$parent = $( $parent[0] );
					} else {
						return;
					}

					var image_holder = $parent.find( '.background-preview' );

					if ( ! image_holder ) { // No preview present
						return;
					}

					var the_id = $parent.find( '.button.background_upload_button' ).data( 'setting_id' ),
						this_setting = api.instance( the_id );

					var background_data = {};

					$parent.find( '.customify_background_select, .customify_background_input' ).each( function() {
						var data = $( this ).serializeArray();

						data = data[0];
						if ( data && data.name.indexOf( '[background-' ) != - 1 ) {

							background_data[$( this ).data( 'select_name' )] = data.value;

							//default_default[data.name] = data.value;
							//if (data.name == "background-image") {
							//	css += data.name + ':url("' + data.value + '");';
							//} else {
							//	css += data.name + ':' + data.value + ';';
							//}
						}
					} );

					api.instance( the_id ).set( background_data );
					//// Notify the customizer api about this change
					api.trigger( 'change' );
					api.previewer.refresh();

					//image_holder.attr('style', css).fadeIn();
				}

				// Update the background preview
				function removeImage( parent ) {
					var selector = parent.find( '.upload_button_div' );
					// This shouldn't have been run...
					if ( ! selector.find( '.remove-image' ).addClass( 'hide' ) ) {
						return;
					}

					selector.find( '.remove-image' ).addClass( 'hide' );//hide "Remove" button
					parent.find( '.customify_background_select' ).addClass( 'hide' );

					selector.find( '.upload' ).val( '' );
					selector.find( '.upload-id' ).val( '' );
					selector.find( '.upload-height' ).val( '' );
					selector.find( '.upload-width' ).val( '' );
					parent.find( '.customify_background_input.background-image' ).val( '' );

					var customizer_id = selector.find( '.background_upload_button' ).data( 'setting_id' ),
						this_setting = api.control( customizer_id + '_control' ),
						current_vals = this_setting.setting(),
						screenshot = parent.find( '.preview_screenshot' ),
						to_array = $.map( current_vals, function( value, index ) {
							return [value];
						} );

					// Hide the screenshot
					screenshot.slideUp();
					selector.find( '.remove-file' ).unbind();
					to_array['background-image'] = '';
					this_setting.setting( to_array );
				}

				return {
					init: init
				}
			}
		)( jQuery );

		// This is for the Font control
		var customifyFontSelect = (
			function() {
				const
					wrapperSelector = '.font-options__wrapper',
					valueHolderSelector = '.customify_font_values',
					fontFamilySelector = '.customify_font_family',
					fontWeightSelector = '.customify_font_weight',
					fontSubsetsSelector = '.customify_font_subsets',
					selectPlaceholder = "Select a font family",
					weightPlaceholder = "Select a font weight",
					subsetPlaceholder = "Extra Subsets";

				// We will use this to remember that we are self-updating the field from the subfields.
				// We will save this info for each setting ID.
				var updatingValue = {},
					loadingValue = {};

				function init( wpapi ) {
					let $fontFamilyFields = $( fontFamilySelector );

					// Initialize the select2 field for the font family
					$fontFamilyFields.select2( {
						placeholder: selectPlaceholder
					} ).on( 'change', function( e ) {
						let new_option = $( e.target ).find( 'option:selected' ),
							wrapper = $( e.target ).closest( wrapperSelector );

						// Update the weight subfield with the new options given by the selected font family.
						update_weight_field( new_option, wrapper );

						// Update the subset subfield with the new options given by the selected font family.
						update_subset_field( new_option, wrapper );

						// Serialize subfield values and refresh the fonts in the preview window.
						update_font_value( wrapper );
					} );

					// Initialize the select2 field for the font weight
					$( fontWeightSelector ).each( function( i, el ) {

						let select2_args = {
							placeholder: weightPlaceholder
						};

						// all this fuss is for the case when the font doesn't come with variants from PHP, like a theme_font
						if ( this.options.length === 0 ) {
							var wrapper = $( el ).closest( wrapperSelector ),
								font = wrapper.find( fontFamilySelector ),
								option = font[0].options[font[0].selectedIndex],
								variants = maybeJsonParse( $( option ).data( 'variants' ) ),
								data = [],
								selecter_variants = $( el ).data( 'default' ) || null;

							if ( typeof variants === "undefined" ) {
								$( this ).hide();
								return;
							}

							$.each( variants, function( index, weight ) {
								let this_value = {
									id: weight,
									text: weight
								};

								if ( selecter_variants !== null && weight == selecter_variants ) {
									this_value.selected = true;
								}

								data.push( this_value );
							} );

							if ( data !== [] ) {
								select2_args.data = data;
							}
						}

						$( this ).select2(
							select2_args
						).on( 'change', function( e ) {
							let wrapper = $( e.target ).closest( wrapperSelector );

							// Serialize subfield values and refresh the fonts in the preview window.
							update_font_value( wrapper );
						} );
					} );

					// Initialize the select2 field for the font subsets
					$( fontSubsetsSelector )
					.select2( {
						placeholder: subsetPlaceholder
					} )
					.on( 'change', function( e ) {
						let wrapper = $( e.target ).closest( wrapperSelector );

						// Serialize subfield values and refresh the fonts in the preview window.
						update_font_value( wrapper );
					} );

					let rangers = $fontFamilyFields.parents( wrapperSelector ).find( 'input[type=range]' ),
						selects = $fontFamilyFields.parents( wrapperSelector ).find( 'select' ).not( "select[class*=' select2'],select[class^='select2']" );

					// Initialize the all the regular selects in the font controls
					if ( selects.length > 0 ) {
						selects.on( 'change', function( e ) {
							let wrapper = $( e.target ).closest( wrapperSelector );

							// Serialize subfield values and refresh the fonts in the preview window.
							update_font_value( wrapper );
						} );
					}

					// Initialize the all the range fields in the font controls
					if ( rangers.length > 0 ) {
						rangers.on( 'change', function( e ) {
							let wrapper = $( e.target ).closest( wrapperSelector );

							// Serialize subfield values and refresh the fonts in the preview window.
							update_font_value( wrapper );

							wp.customize.previewer.send( 'font-changed' );
						} );
					}

					// When the previewer window is ready, render the fonts
					var self = this;
					wp.customize.previewer.bind( 'ready', function() {
						self.render_fonts();
					} );

					// Handle the reverse value direction, when the customize setting is updated and the subfields need to update their values.
					$fontFamilyFields.each( function( i, el ) {
						let wrapper = $( el ).closest( wrapperSelector ),
							value_holder = wrapper.children( valueHolderSelector ),
							setting_id = $( value_holder ).data( 'customize-setting-link' ),
							setting = wp.customize( setting_id );

						setting.bind( function( newValue, oldValue ) {
							if ( ! updatingValue[this.id] ) {
								value_holder.val( newValue );

								load_font_value( wrapper );
							}
						} )
					} )
				}

				/**
				 * This function updates the data in font weight selector from the given <option> element
				 *
				 * @param option
				 * @param wraper
				 */
				function update_weight_field( option, wraper ) {
					let variants = $( option ).data( 'variants' ),
						font_weights = wraper.find( fontWeightSelector ),
						selected_variant = font_weights.data( 'default' ),
						new_variants = [],
						id = wraper.find( valueHolderSelector ).data( 'customizeSettingLink' );

					variants = maybeJsonParse( variants );

					if ( customify_settings.settings[id].load_all_weights || typeof variants === "undefined" || Object.keys( variants ).length < 2 ) {
						font_weights.parent().hide();
					} else {
						font_weights.parent().show();
					}

					// we need to turn the data array into a specific form like [{id:"id", text:"Text"}]
					$.each( variants, function( index, variant ) {
						new_variants[index] = {
							'id': variant,
							'text': variant
						};

						if ( selected_variant == variant ) {
							new_variants[index].selected = true;
						}
					} );

					// We need to clear the old select2 field and reinitialize it.
					$( font_weights ).select2().empty();
					$( font_weights ).select2( {
						data: new_variants
					} ).on( 'change', function( e ) {
						let wrapper = $( e.target ).closest( wrapperSelector );

						// Serialize subfield values and refresh the fonts in the preview window.
						update_font_value( wrapper );
					} );
				}

				/**
				 *  This function updates the data in font subset selector from the given <option> element
				 * @param option
				 * @param wraper
				 */
				function update_subset_field( option, wraper ) {
					let subsets = $( option ).data( 'subsets' ),
						font_subsets = wraper.find( fontSubsetsSelector ),
						new_subsets = [],
						type = $( option ).data( 'type' );

					if ( type !== 'google' ) {
						font_subsets.parent().hide();
						return;
					}

					let current_value = wraper.children( valueHolderSelector ).val();

					current_value = maybeJsonParse( current_value );
					if ( _.isUndefined( current_value.selected_subsets ) ) {
						return;
					}
					current_value = current_value.selected_subsets;

					subsets = maybeJsonParse( subsets );

					if ( typeof subsets != 'undefined' && Object.keys( subsets ).length < 2 ) {
						font_subsets.parent().hide();
					} else {
						font_subsets.parent().show();
					}

					// we need to turn the data array into a specific form like [{id:"id", text:"Text"}]
					$.each( subsets, function( index, subset ) {
						new_subsets[index] = {
							'id': subset,
							'text': subset
						};

						// current_subsets
						if ( typeof current_value !== 'undefined' && current_value !== null && current_value.indexOf( subset ) !== - 1 ) {
							new_subsets[index].selected = true;
						}
					} );

					// We need to clear the old select2 field and reinitialize it.
					$( font_subsets ).select2().empty();
					$( font_subsets ).select2( {
						data: new_subsets
					} ).on( 'change', function( e ) {
						let wrapper = $( e.target ).closest( wrapperSelector );

						// Serialize subfield values and refresh the fonts in the preview window.
						update_font_value( wrapper );
					} );
				}

				/**
				 * This function is a custom value serializer for our entire font field
				 * It collects values and saves them (encoded) into the `.customify_font_values` input's value
				 */
				function update_font_value( wraper ) {
					let options_list = $( wraper ).find( '.font-options__options-list' ),
						inputs = options_list.find( '[data-field]' ),
						value_holder = wraper.children( valueHolderSelector ),
						setting_id = $( value_holder ).data( 'customize-setting-link' ),
						setting = wp.customize( setting_id ),
						newFontData = {};

					// If we are already self-updating this and we haven't finished, we need to stop here to prevent infinite loops
					// This call might have come from a subfield detecting the change the triggering a further update_font_value()
					if ( true === updatingValue[setting_id] ) {
						return;
					}

					// If we are loading this setting value and haven't finished, there is no point in updating it as this would cause infinite loops.
					if ( true === loadingValue[setting_id] ) {
						return;
					}

					// Mark the fact that we are self-updating the field value
					updatingValue[setting_id] = true;

					inputs.each( function( key, el ) {
						let field = $( el ).data( 'field' ),
							value = $( el ).val();

						if ( 'font_family' === field ) {
							// the font family also holds the type
							let selected_opt = $( el.options[el.selectedIndex] ),
								type = selected_opt.data( 'type' ),
								subsets = selected_opt.data( 'subsets' ),
								variants = selected_opt.data( 'variants' );

							if ( ! _.isUndefined( type ) ) {
								newFontData['type'] = type;
								if ( type === 'theme_font' ) {
									newFontData['src'] = selected_opt.data( 'src' );
								}
							}

							if ( ! _.isUndefined( variants ) ) {
								newFontData['variants'] = maybeJsonParse( variants );
							}

							if ( ! _.isUndefined( subsets ) ) {
								newFontData['subsets'] = maybeJsonParse( subsets );
							}
						}


						if ( ! _.isUndefined( field ) && ! _.isUndefined( value ) && ! _.isNull( value ) && value !== '' ) {
							newFontData[field] = value;
						}
					} );

					// Serialize the newly gathered font data
					let serializedNewFontData = encodeValues( newFontData );
					// Set the serialized value in the hidden field.
					value_holder.val( serializedNewFontData );
					// Update also the Customizer setting value.
					setting.set( serializedNewFontData );


					// Finished with the field value self-updating.
					updatingValue[setting_id] = false;

					return newFontData;
				}

				/**
				 * This function is a reverse of update_font_value(), initializing the entire font field controls based on the value stored in the hidden input.
				 */
				function load_font_value( wrapper ) {
					let options_list = $( wrapper ).find( '.font-options__options-list' ),
						inputs = options_list.find( '[data-field]' ),
						value_holder = wrapper.children( valueHolderSelector ),
						value = maybeJsonParse( value_holder.val() ),
						setting_id = $( value_holder ).data( 'customize-setting-link' );

					// If we are already loading this setting value and haven't finished, there is no point in starting again.
					if ( true === loadingValue[setting_id] ) {
						return;
					}

					// Mark the fact that we are loading the field value
					loadingValue[setting_id] = true;

					inputs.each( function( key, el ) {
						let field = $( el ).data( 'field' );

						// In the case of select2, only the original selects have the data field, thus excluding select2 created select DOM elements
						if ( typeof field !== "undefined" && field !== "" && typeof value[field] !== "undefined" ) {
							$( el ).val( value[field] ).trigger( 'change' );
						}
					} );

					// Finished with the field value loading.
					loadingValue[setting_id] = false;
				}

				var maybeJsonParse = function( value ) {
					let parsed;

					//try and parse it, with decodeURIComponent
					try {
						parsed = JSON.parse( decodeURIComponent( value ) );
					} catch ( e ) {

						// in case of an error, treat is as a string
						parsed = value;
					}

					return parsed;
				};

				function encodeValues( obj ) {
					return encodeURIComponent( JSON.stringify( obj ) );
				}

				function render_fonts() {
					$( '.customify_font_family' ).select2().trigger( 'change' )
				}

				return {
					render_fonts: render_fonts,
					init: init,
					update_font_value: update_font_value
				};
			}
		)();

		var Queue = function() {
			var lastPromise = null;
			var queueDeferred = null;
			var methodDeferred = null;

			this.add_steps = function( key, steps, args ) {
				var self = this;
				this.methodDeferred = $.Deferred();
				this.queueDeferred = this.setup();

				$.each( steps, function( i, step ) {
					self.queue( key, step );
				} );
			};

			this.process_remote_step = function( key, data, step ) {
				var self = this;

				if ( _.isUndefined( data ) || _.isNull( data ) ) {
					return false;
				}

				var new_step = step;
				$.each( data, function( i, k ) {
					debugger;
					// prepare data for new requests
					new_step.recall_data = k.data;
					new_step.recall_type = k.type;
					new_step.type = 'recall';

					self.queue( key, new_step, k.id );
				} );
			};

			this.log_action = function( action, key, msg ) {
				if ( action === 'start' ) {
					$( '.wpGrade-import-results' ).show();
					$( '.wpGrade-import-results' ).append( '<span class="import_step_note imports_step_' + key + '" ><span class="step_info" data-balloon="Working on it" data-balloon-pos="up"></span>Importing ' + key + '</span>' );
				} else if ( action === 'end' ) {
					var $notice = $( '.imports_step_' + key + ' .step_info' );

					if ( $notice.length > 0 || msg !== "undefined" ) {
						$notice.attr( 'data-balloon', msg );
						$notice.addClass( 'success' );
					} else {
						$notice.attr( 'data-balloon', 'Done' );
						$notice.addClass( 'failed' );
					}
				}
			};

			this.queue = function( key, data, step_key ) {
				var self = this;
				if ( ! _.isUndefined( step_key ) ) {
					this.log_action( 'start', step_key );
				}

				// execute next queue method
				this.queueDeferred.done( this.request( key, data, step_key ) );
				lastPromise = self.methodDeferred.promise();
			};

			this.request = function( key, step, step_key ) {
				var self = this;
				// call actual method and wrap output in deferred
				//setTimeout( function() {
				var data_args = {
					action: 'customify_import_step',
					step_id: step.id,
					step_type: step.type,
					option_key: key
				};

				if ( ! _.isUndefined( step.recall_data ) ) {
					data_args.recall_data = step.recall_data;
				}

				if ( ! _.isUndefined( step.recall_type ) ) {
					data_args.recall_type = step.recall_type;
				}

				$.ajax( {
					url: customify_settings.import_rest_url + 'customify/1.0/import',
					method: 'POST',
					beforeSend: function( xhr ) {
						xhr.setRequestHeader( 'X-WP-Nonce', WP_API_Settings.nonce );
					},
					dataType: 'json',
					contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
					data: data_args
				} ).done( function( response ) {
					if ( ! _.isUndefined( response.success ) && response.success ) {
						var results = response.data;
						if ( step.type === 'remote' ) {
							self.process_remote_step( key, results, step );
						}
					}

					if ( ! _.isUndefined( step_key ) && ! _.isUndefined( response.message ) ) {
						self.log_action( 'end', step_key, response.message );
					}
				} );

				self.methodDeferred.resolve();
				//}, 3450 );
			};

			this.setup = function() {
				var self = this;

				self.queueDeferred = $.Deferred();

				// when the previous method returns, resolve this one
				$.when( lastPromise ).always( function() {
					self.queueDeferred.resolve();
				} );

				return self.queueDeferred.promise();
			}
		};

		/** HELPERS **/

		/**
		 * Function to check if a value exists in an object
		 * @param value
		 * @param obj
		 * @returns {boolean}
		 */
		var inObject = function( value, obj ) {
			for ( var k in obj ) {
				if ( ! obj.hasOwnProperty( k ) ) {
					continue;
				}
				if ( _.isEqual( obj[k], value ) ) {
					return true;
				}
			}
			return false;
		};

		var maybeJsonParse = function( value ) {
			var parsed;

			//try and parse it, with decodeURIComponent
			try {
				parsed = JSON.parse( decodeURIComponent( value ) );
			} catch ( e ) {

				// in case of an error, treat is as a string
				parsed = value;
			}

			return parsed;
		};

		var getUrlVars = function( name ) {
			var vars = [], hash;
			var hashes = window.location.href.slice( window.location.href.indexOf( '?' ) + 1 ).split( '&' );
			for ( var i = 0; i < hashes.length; i ++ ) {
				hash = hashes[i].split( '=' );

				vars.push( hash[0] );
				vars[hash[0]] = hash[1];
			}

			if ( ! _.isUndefined( vars[name] ) ) {
				return vars[name];
			}
			return false;
		};

		var isJsonString = function( str ) {
			try {
				JSON.parse( str );
			} catch ( e ) {
				return false;
			}
			return true;
		};
	}
)( jQuery, window, wp );


// Reverses a hex color to either black or white
function customifyInverseHexColorToBlackOrWhite( hex ) {
	return customifyInverseHexColor( hex, true );
}

// Taken from here: https://stackoverflow.com/a/35970186/6260836
function customifyInverseHexColor( hex, bw ) {
	if ( hex.indexOf( '#' ) === 0 ) {
		hex = hex.slice( 1 );
	}
	// convert 3-digit hex to 6-digits.
	if ( hex.length === 3 ) {
		hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
	}
	if ( hex.length !== 6 ) {
		throw new Error( 'Invalid HEX color.' );
	}
	var r = parseInt( hex.slice( 0, 2 ), 16 ),
		g = parseInt( hex.slice( 2, 4 ), 16 ),
		b = parseInt( hex.slice( 4, 6 ), 16 );
	if ( bw ) {
		// http://stackoverflow.com/a/3943023/112731
		return (
			       r * 0.299 + g * 0.587 + b * 0.114
		       ) > 186
			? '#000000'
			: '#FFFFFF';
	}
	// invert color components
	r = (
		255 - r
	).toString( 16 );
	g = (
		255 - g
	).toString( 16 );
	b = (
		255 - b
	).toString( 16 );
	// pad each with zeros and return
	return "#" + customifyPadZero( r ) + customifyPadZero( g ) + customifyPadZero( b );
}

function customifyPadZero( str, len ) {
	len = len || 2;
	var zeros = new Array( len ).join( '0' );
	return (
		zeros + str
	).slice( - len );
}

// Shading, Blending and Converting colors
// Taken from here: https://github.com/PimpTrizkit/PJs/wiki/12.-Shade,-Blend-and-Convert-a-Web-Color-(pSBC.js)
const pSBC = function( p, from, to ) {
	if ( typeof(
			p
		) != "number" || p < - 1 || p > 1 || typeof(
			from
		) != "string" || (
		     from[0] != 'r' && from[0] != '#'
	     ) || (
		     to && typeof(
			     to
		     ) != "string"
	     ) ) {
		return null;
	} //ErrorCheck
	if ( ! this.pSBCr ) {
		this.pSBCr = ( d ) => {
			let l = d.length, RGB = {};
			if ( l > 9 ) {
				d = d.split( "," );
				if ( d.length < 3 || d.length > 4 ) {
					return null;
				}//ErrorCheck
				RGB[0] = i( d[0].split( "(" )[1] ), RGB[1] = i( d[1] ), RGB[2] = i( d[2] ), RGB[3] = d[3] ? parseFloat( d[3] ) : - 1;
			} else {
				if ( l == 8 || l == 6 || l < 4 ) {
					return null;
				} //ErrorCheck
				if ( l < 6 ) {
					d = "#" + d[1] + d[1] + d[2] + d[2] + d[3] + d[3] + (
						l > 4 ? d[4] + "" + d[4] : ""
					);
				} //3 or 4 digit
				d = i( d.slice( 1 ), 16 ), RGB[0] = d >> 16 & 255, RGB[1] = d >> 8 & 255, RGB[2] = d & 255, RGB[3] = - 1;
				if ( l == 9 || l == 5 ) {
					RGB[3] = r( (
						            RGB[2] / 255
					            ) * 10000 ) / 10000, RGB[2] = RGB[1], RGB[1] = RGB[0], RGB[0] = d >> 24 & 255;
				}
			}
			return RGB;
		}
	}
	var i = parseInt, r = Math.round, h = from.length > 9, h = typeof(
			to
		) == "string" ? to.length > 9 ? true : to == "c" ? ! h : false : h, b = p < 0, p = b ? p * - 1 : p,
		to = to && to != "c" ? to : b ? "#000000" : "#FFFFFF", f = this.pSBCr( from ), t = this.pSBCr( to );
	if ( ! f || ! t ) {
		return null;
	} //ErrorCheck
	if ( h ) {
		return "rgb" + (
			f[3] > - 1 || t[3] > - 1 ? "a(" : "("
		) + r( (
			       t[0] - f[0]
		       ) * p + f[0] ) + "," + r( (
			       t[1] - f[1]
		       ) * p + f[1] ) + "," + r( (
			       t[2] - f[2]
		       ) * p + f[2] ) + (
			       f[3] < 0 && t[3] < 0 ? ")" : "," + (
			       f[3] > - 1 && t[3] > - 1 ? r( (
				                                     (
					                                     t[3] - f[3]
				                                     ) * p + f[3]
			                                     ) * 10000 ) / 10000 : t[3] < 0 ? f[3] : t[3]
		       ) + ")"
		       );
	} else {
		return "#" + (
		       0x100000000 + r( (
			                        t[0] - f[0]
		                        ) * p + f[0] ) * 0x1000000 + r( (
			                                                        t[1] - f[1]
		                                                        ) * p + f[1] ) * 0x10000 + r( (
			                                                                                      t[2] - f[2]
		                                                                                      ) * p + f[2] ) * 0x100 + (
			       f[3] > - 1 && t[3] > - 1 ? r( (
				                                     (
					                                     t[3] - f[3]
				                                     ) * p + f[3]
			                                     ) * 255 ) : t[3] > - 1 ? r( t[3] * 255 ) : f[3] > - 1 ? r( f[3] * 255 ) : 255
		       )
		).toString( 16 ).slice( 1, f[3] > - 1 || t[3] > - 1 ? undefined : - 2 );
	}
};