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
				title: 'Title',
				quote: 'Quotation'
			};
			
			t.tag = null;
			
			t.bm = null;
			
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
				
				$('select[name="lang"]')[0].value = '';
				$('select[name="level"]')[0].value = '';
				$('input[name="ref"]')[0].value = '';
				$('select[name="level"]').css({borderColor: ''});
				
				t.mode = t.ADD;
				t.showDialog(val, pos);
			});
			
			ed.addCommand('editCustomTag', function(tag, pos) {
				var val = tag.attr('class').split('Tag')[0]; 
				t.currentVal = val;
				t.tag = tag;
				
				var lang = tag.attr('lang');
				var level = tag.attr('level');
				var ref = tag.attr('ref');
				$('select[name="lang"]')[0].value = lang;
				$('select[name="level"]')[0].value = level;
				$('input[name="ref"]')[0].value = ref;
				$('select[name="level"]').css({borderColor: ''});
				
				t.mode = t.EDIT;
				t.showDialog(val, pos);
			});
			
			$(document.body).append(''+
				'<div id="customTagsDialog">'+
				'<div id="lang">'+
				'<label for="lang">Select language (optional)</label>'+
				'<select name="lang">'+
				'<option value=""></option>'+
				'<option value="af">Afrikaans</option>'+
				'<option value="sq">Albanian</option>'+
				'<option value="ar">Arabic</option>'+
				'<option value="be">Belarusian</option>'+
				'<option value="bg">Bulgarian</option>'+
				'<option value="ca">Catalan</option>'+
				'<option value="zh-CN">Chinese Simplified</option>'+
				'<option value="zh-TW">Chinese Traditional</option>'+
				'<option value="hr">Croatian</option>'+
				'<option value="cs">Czech</option>'+
				'<option value="da">Danish</option>'+
				'<option value="nl">Dutch</option>'+
				'<option value="en">English</option>'+
				'<option value="et">Estonian</option>'+
				'<option value="tl">Filipino</option>'+
				'<option value="fi">Finnish</option>'+
				'<option value="fr">French</option>'+
				'<option value="gl">Galician</option>'+
				'<option value="de">German</option>'+
				'<option value="el">Greek</option>'+
				'<option value="ht">Haitian Creole</option>'+
				'<option value="iw">Hebrew</option>'+
				'<option value="hi">Hindi</option>'+
				'<option value="hu">Hungarian</option>'+
				'<option value="is">Icelandic</option>'+
				'<option value="id">Indonesian</option>'+
				'<option value="ga">Irish</option>'+
				'<option value="it">Italian</option>'+
				'<option value="ja">Japanese</option>'+
				'<option value="lv">Latvian</option>'+
				'<option value="lt">Lithuanian</option>'+
				'<option value="mk">Macedonian</option>'+
				'<option value="ms">Malay</option>'+
				'<option value="mt">Maltese</option>'+
				'<option value="no">Norwegian</option>'+
				'<option value="fa">Persian</option>'+
				'<option value="pl">Polish</option>'+
				'<option value="pt">Portuguese</option>'+
				'<option value="ro">Romanian</option>'+
				'<option value="ru">Russian</option>'+
				'<option value="sr">Serbian</option>'+
				'<option value="sk">Slovak</option>'+
				'<option value="sl">Slovenian</option>'+
				'<option value="es">Spanish</option>'+
				'<option value="sw">Swahili</option>'+
				'<option value="sv">Swedish</option>'+
				'<option value="th">Thai</option>'+
				'<option value="tr">Turkish</option>'+
				'<option value="uk">Ukrainian</option>'+
				'<option value="vi">Vietnamese</option>'+
				'<option value="cy">Welsh</option>'+
				'<option value="yi">Yiddish</option>'+
				'</select>'+
				'</div>'+
				'<div id="level">'+
				'<label for="level">Level</label>'+
				'<select name="level">'+
				'<option value="a">Analytic</option>'+
				'<option value="m">Monographic</option>'+
				'<option value="j">Journal</option>'+
				'<option value="s">Series</option>'+
				'<option value="u">Unpublished</option>'+
				'</select>'+
				'</div>'+
				'<div id="ref">'+
				'<label for="ref">Reference (optional)</label>'+
				'<input name="ref" type="text" />'+
				'</div>'+
				'</div>'
			);
			$('#customTagsDialog > div').css({marginBottom: '5px'});
			t.d = $('#customTagsDialog');
			t.d.dialog({
				modal: true,
				resizable: false,
				closeOnEscape: false,
				open: function(event, ui) {
					$('#customTagsDialog').parent().find('.ui-dialog-titlebar-close').hide();
				},
				height: 150,
				width: 325,
				autoOpen: false,
				buttons: {
					'Ok': function() {
						var lang = $('select[name="lang"]')[0].value;
						var level = $('select[name="level"]')[0].value;
						var ref = $('input[name="ref"]')[0].value;
						
						var params = {};
						if (t.currentVal == 'para') {
							params = {
								'class': 'paraTag',
								lang: lang
							};
						} else if (t.currentVal == 'title') {
							if (level == 'a' || level == 'u') {
								params = {
									'class': 'titleTagQuotes',
									level: level,
									ref: ref
								};
							} else if (level == 'm' || level == 'j' || level == 's') {
								params = {
									'class': 'titleTagItalics',
									level: level,
									ref: ref
								};
							} else {
								$('select[name="level"]').css({borderColor: 'red'});
								return false;
							}
						} else if (t.currentVal == 'quote') {
							var selection = t.editor.selection.getContent();
							if (selection.length > 250) {
								params = {
									'class': 'quoteTagLong',
									lang: lang
								};
							} else {
								params = {
									'class': 'quoteTagShort',
									lang: lang
								};
							}
						}
						params.type = t.currentVal;
						
						switch (t.mode) {
							case t.ADD:
								t.editor.execCommand('addStructureTag', t.bm, params);
								break;
							case t.EDIT:
								t.editor.execCommand('editStructureTag', t.tag, params);
								t.tag = null;
						}
						
						t.d.dialog('close');
					},
					'Cancel': function() {
						t.editor.selection.moveToBookmark(t.bm);
						t.d.dialog('close');
					}
				}
			});
		},
		showDialog: function(val, pos) {
			var t = this;
			t.currentVal = val;
			if (val == 'head') {
				t.editor.execCommand('addStructureTag', t.bm, {
					type: 'head',
					'class': 'headTag'
				});
				t.editor.execCommand('updateStructureTree', true);
			} else if (val == 'emph') {
				t.editor.execCommand('addStructureTag', t.bm, {
					type: 'emph',
					'class': 'emphTag'
				});
				t.editor.execCommand('updateStructureTree', true);
			} else if (val != '') {
				if (val == 'title') {
					$('#lang').hide();
					$('#level').show();
					$('#ref').show();
				} else {
					$('#lang').show();
					$('#level').hide();
					$('#ref').hide();
				}
				
				var title = t.titles[val];
				t.d.dialog('option', 'title', title);
				if (pos) {
					t.d.dialog('option', 'position', [pos.x, pos.y]);
				}
				t.d.dialog('open');
			}
		},
		createControl: function(n, cm) {
			if (n == 'customtags') {
				var t = this;
				var url = t.url+'/../../../../../../img/';
				t.menuButton = cm.createMenuButton('customTagsButton', {
					title: 'Add Tag',
					image: url+'tag.png',
					'class': 'entityButton'
				});
				t.menuButton.onRenderMenu.add(function(c, m) {
					m.add({
						title: 'Paragraph',
						icon_src: url+'para.png',
						onclick : function() {
							t.editor.execCommand('addCustomTag', 'para');
						}
					});
					m.add({
						title: 'Heading',
						icon_src: url+'heading.png',
						onclick : function() {
							t.editor.execCommand('addCustomTag', 'head');
						}
					});
					m.add({
						title: 'Emphasized',
						icon_src: url+'text_italic.png',
						onclick : function() {
							t.editor.execCommand('addCustomTag', 'emph');
						}
					});
					m.add({
						title: 'Title',
						icon_src: url+'title.png',
						onclick : function() {
							t.editor.execCommand('addCustomTag', 'title');
						}
					});
					m.add({
						title: 'Quotation',
						icon_src: url+'quote.png',
						onclick : function() {
							t.editor.execCommand('addCustomTag', 'quote');
						}
					});
				});
				
				return t.menuButton;
			}
	
			return null;
		}
	});
	
	tinymce.PluginManager.add('customtags', tinymce.plugins.CustomTags);
})(tinymce);