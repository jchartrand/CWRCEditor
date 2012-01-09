/**
 * This plugin handles both custom structural tags, and schema tags.
 */
(function(tinymce) {
	tinymce.create('tinymce.plugins.CustomTags', {
		init: function(ed, url) {
			var t = this;
			t.url = url;
			t.editor = ed;
			t.currentVal = null;
			
			t.ADD = 0;
			t.EDIT = 1;
			t.mode = null;
			
			t.titles = {
				para: 'Paragraph',
				head: 'Heading',
				emph: 'Emphasized',
				quote: 'Quotation'
			};
			
			t.tag = null;
			
			t.bm = null;
			
			ed.addCommand('createCustomTagsControl', function(config) {
				var url = t.url+'/../../img/';
				config.menu.add({
					title: 'Paragraph',
					icon_src: url+'para.png',
					onclick : function() {
						ed.execCommand('addCustomTag', 'para', config.pos);
					}
				}).setDisabled(config.disabled);
				config.menu.add({
					title: 'Heading',
					icon_src: url+'heading.png',
					onclick : function() {
						ed.execCommand('addCustomTag', 'head', config.pos);
					}
				}).setDisabled(config.disabled);
				config.menu.add({
					title: 'Emphasized',
					icon_src: url+'text_italic.png',
					onclick : function() {
						ed.execCommand('addCustomTag', 'emph', config.pos);
					}
				}).setDisabled(config.disabled);
				config.menu.add({
					title: 'Quotation',
					icon_src: url+'quote.png',
					onclick : function() {
						ed.execCommand('addCustomTag', 'quote', config.pos);
					}
				}).setDisabled(config.disabled);
			});
			
			ed.addCommand('addCustomTag', function(val, pos) {
				var valid = ed.execCommand('isSelectionValid', true);
				if (valid != 2) {
					ed.execCommand('showError', valid);
					return;
				}
				
				var sel = ed.selection;
				var content = sel.getContent();
				var range = sel.getRng(true);
				if (range.startContainer == range.endContainer) {
					var leftTrimAmount = content.match(/^\s{0,1}/)[0].length;
					var rightTrimAmount = content.match(/\s{0,1}$/)[0].length;
					range.setStart(range.startContainer, range.startOffset+leftTrimAmount);
					range.setEnd(range.endContainer, range.endOffset-rightTrimAmount);
					sel.setRng(range);
				}
				
				t.bm = t.editor.selection.getBookmark();
				
				$('select[name="lang"] > option[value="en"]', t.lang).attr('selected', true);
				if (val == 'quote') {
					var selection = t.editor.selection.getContent();
					if (selection.length > 250) {
						$('#quoteFormat input[value="quoteTagLong"]').prop('checked', true);
					} else {
						$('#quoteFormat input[value="quoteTagShort"]').prop('checked', true);
					}
				}
				
				t.mode = t.ADD;
				t.showCustomTagDialog(val, pos);
			});
			
			ed.addCommand('editCustomTag', function(tag, pos) {
				var val = tag.attr('class').split('Tag')[0]; 
				t.currentVal = val;
				t.tag = tag;
				
				var lang = tag.attr('lang');
				$('select[name="lang"] > option[value="'+lang+'"]', t.lang).attr('selected', true);
				if (val == 'quote') {
					var type = tag.attr('class');
					$('#quoteFormat input[value="'+type+'"]').prop('checked', true);
				}
				
				t.mode = t.EDIT;
				t.showCustomTagDialog(val, pos);
			});
			
			$(document.body).append(''+
				'<div id="langDialog">'+
				'<div>'+
				'<label for="lang">Select language (optional)</label>'+
				'<select name="lang"><option value=""></option><option value="af">Afrikaans</option><option value="sq">Albanian</option><option value="ar">Arabic</option><option value="be">Belarusian</option><option value="bg">Bulgarian</option><option value="ca">Catalan</option><option value="zh-CN">Chinese Simplified</option><option value="zh-TW">Chinese Traditional</option><option value="hr">Croatian</option><option value="cs">Czech</option><option value="da">Danish</option><option value="nl">Dutch</option><option value="en" selected="selected">English</option><option value="et">Estonian</option><option value="tl">Filipino</option><option value="fi">Finnish</option><option value="fr">French</option><option value="gl">Galician</option><option value="de">German</option><option value="el">Greek</option><option value="ht">Haitian Creole</option><option value="iw">Hebrew</option><option value="hi">Hindi</option><option value="hu">Hungarian</option><option value="is">Icelandic</option><option value="id">Indonesian</option><option value="ga">Irish</option><option value="it">Italian</option><option value="ja">Japanese</option><option value="lv">Latvian</option><option value="lt">Lithuanian</option><option value="mk">Macedonian</option><option value="ms">Malay</option><option value="mt">Maltese</option><option value="no">Norwegian</option><option value="fa">Persian</option><option value="pl">Polish</option><option value="pt">Portuguese</option><option value="ro">Romanian</option><option value="ru">Russian</option><option value="sr">Serbian</option><option value="sk">Slovak</option><option value="sl">Slovenian</option><option value="es">Spanish</option><option value="sw">Swahili</option><option value="sv">Swedish</option><option value="th">Thai</option><option value="tr">Turkish</option><option value="uk">Ukrainian</option><option value="vi">Vietnamese</option><option value="cy">Welsh</option><option value="yi">Yiddish</option></select>'+
				'</div>'+
				'<div id="overrideFormat" style="margin-top: 10px;">'+
				'<label for="overrideCheckbox">Override standard formatting</label><input type="checkbox" name="override" id="overrideCheckbox" />'+
				'<div id="quoteFormat" style="margin-top: 10px;">'+
				'<input id="quoteTagLongRadio" type="radio" name="format" value="quoteTagLong" disabled="disabled" /><label for="quoteTagLongRadio">Indent</label><br/>'+
				'<input id="quoteTagShortRadio" type="radio" name="format" value="quoteTagShort" disabled="disabled" /><label for="quoteTagShortRadio">Quotation marks/run in</label><br/>'+
				'<input id="quoteTagRadio" type="radio" name="format" value="quoteTag" disabled="disabled" /><label for="quoteTagRadio">No formatting/run in</label><br/>'+
				'</div>'+
				'</div>'+
				'</div>'
			);
			
			$('#overrideFormat').hide();
			
			$('#overrideCheckbox').change(function() {
				if ($('#quoteFormat input').is(':disabled')) {
					$('#quoteFormat input').prop('disabled', false);
				} else {
					$('#quoteFormat input').prop('disabled', true);
				}
			});
			
			t.lang = $('#langDialog');
			
			t.lang.dialog({
				modal: true,
				resizable: false,
				closeOnEscape: false,
				open: function(event, ui) {
					$('#langDialog').parent().find('.ui-dialog-titlebar-close').hide();
				},
				height: 125,
				width: 325,
				autoOpen: false,
				buttons: {
					'Ok': function() {
						langResult();
					},
					'Cancel': function() {
						t.editor.selection.moveToBookmark(t.bm);
						t.lang.dialog('close');
					}
				}
			});
			
			$('#langDialog select').keyup(function(event) {
				if (event.keyCode == '13') {
					event.preventDefault();
					langResult();
				}
			});
			
			var langResult = function() {
				var lang = $('select[name="lang"]', t.lang).val();
				
				var params = {
					lang: lang,
					_tag: t.currentVal
				};
				
				if (t.currentVal == 'para') {
					params['class'] = 'paraTag';
				} else if (t.currentVal == 'quote') {
					if ($('#overrideCheckbox').is(':checked')) {
						params['class'] = $('#quoteFormat input:checked').val();;
					} else {
						var selection = t.editor.selection.getContent();
						if (selection.length > 250) {
							params['class'] = 'quoteTagLong';
						} else {
							params['class'] = 'quoteTagShort';
						}
					}
				}
				
				switch (t.mode) {
					case t.ADD:
						t.editor.execCommand('addStructureTag', t.bm, params);
						break;
					case t.EDIT:
						t.editor.execCommand('editStructureTag', t.tag, params);
						t.tag = null;
				}
				
				t.lang.dialog('close');
			};
		},
		showCustomTagDialog: function(val, pos) {
			var t = this;
			t.currentVal = val;
			if (val == 'head') {
				t.editor.execCommand('addStructureTag', t.bm, {
					_tag: 'head',
					_editable: false,
					'class': 'headTag'
				});
				t.editor.execCommand('updateStructureTree', true);
			} else if (val == 'emph') {
				t.editor.execCommand('addStructureTag', t.bm, {
					_tag: 'emph',
					_editable: false,
					'class': 'emphTag'
				});
				t.editor.execCommand('updateStructureTree', true);
			} else if (val != '') {
				if (val == 'quote') {
					$('#overrideFormat').show();
					t.lang.dialog('option', 'height', 225);
				} else {
					$('#overrideFormat').hide();
					t.lang.dialog('option', 'height', 125);
				}
				
				var title = t.titles[val];
				t.lang.dialog('option', 'title', title);
				if (pos) t.lang.dialog('option', 'position', [pos.x, pos.y]);
				t.lang.dialog('open');
			}
		},
		createControl: function(n, cm) {
			if (n == 'customtags') {
				var t = this;
				var url = t.url+'/../../img/';
				t.menuButton = cm.createMenuButton('customTagsButton', {
					title: 'Tags',
					image: url+'tag.png',
					'class': 'entityButton'
				});
				t.menuButton.onRenderMenu.add(function(c, m) {
					t.editor.execCommand('createCustomTagsControl', {menu: m, disabled: false});
					m.addSeparator();
					t.editor.execCommand('createSchemaTagsControl', {menu: m, disabled: false});
				});
				
				return t.menuButton;
			}
	
			return null;
		}
	});
	
	tinymce.PluginManager.add('customtags', tinymce.plugins.CustomTags);
})(tinymce);