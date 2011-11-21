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
				title: 'Text/Title',
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
				
				if (val == 'title') {
					$('input[value="m"]', t.level).attr('checked', true);
					$('input[name="ref"]', t.level).attr('value', '');
					$('input[name="alt"]', t.level).attr('value', '');
					$('input[name="unformatted"]', t.level).attr('checked', false);
				} else {
					$('select[name="lang"] > option[value="en"]', t.lang).attr('selected', true);
				}
				
				t.mode = t.ADD;
				t.showDialog(val, pos);
			});
			
			ed.addCommand('editCustomTag', function(tag, pos) {
				var val = tag.attr('class').split('Tag')[0]; 
				t.currentVal = val;
				t.tag = tag;
				
				if (val == 'title') {
					var level = tag.attr('level');
					var ref = tag.attr('ref');
					var alt = tag.attr('alt');
					var unformatted = tag.attr('unformatted');
					$('input[value="'+level+'"]', t.level).attr('checked', true);
					$('input[name="ref"]', t.level).attr('value', ref);
					$('input[name="alt"]', t.level).attr('value', alt);
					$('input[name="unformatted"]', t.level).attr('checked', unformatted);
				} else {
					var lang = tag.attr('lang');
					$('select[name="lang"] > option[value="'+lang+'"]', t.lang).attr('selected', true);
				}
				
				t.mode = t.EDIT;
				t.showDialog(val, pos);
			});
			
			$(document.body).append(''+
				'<div id="langDialog">'+
				'<label for="lang">Select language (optional)</label>'+
				'<select name="lang"><option value=""></option><option value="af">Afrikaans</option><option value="sq">Albanian</option><option value="ar">Arabic</option><option value="be">Belarusian</option><option value="bg">Bulgarian</option><option value="ca">Catalan</option><option value="zh-CN">Chinese Simplified</option><option value="zh-TW">Chinese Traditional</option><option value="hr">Croatian</option><option value="cs">Czech</option><option value="da">Danish</option><option value="nl">Dutch</option><option value="en" selected="selected">English</option><option value="et">Estonian</option><option value="tl">Filipino</option><option value="fi">Finnish</option><option value="fr">French</option><option value="gl">Galician</option><option value="de">German</option><option value="el">Greek</option><option value="ht">Haitian Creole</option><option value="iw">Hebrew</option><option value="hi">Hindi</option><option value="hu">Hungarian</option><option value="is">Icelandic</option><option value="id">Indonesian</option><option value="ga">Irish</option><option value="it">Italian</option><option value="ja">Japanese</option><option value="lv">Latvian</option><option value="lt">Lithuanian</option><option value="mk">Macedonian</option><option value="ms">Malay</option><option value="mt">Maltese</option><option value="no">Norwegian</option><option value="fa">Persian</option><option value="pl">Polish</option><option value="pt">Portuguese</option><option value="ro">Romanian</option><option value="ru">Russian</option><option value="sr">Serbian</option><option value="sk">Slovak</option><option value="sl">Slovenian</option><option value="es">Spanish</option><option value="sw">Swahili</option><option value="sv">Swedish</option><option value="th">Thai</option><option value="tr">Turkish</option><option value="uk">Ukrainian</option><option value="vi">Vietnamese</option><option value="cy">Welsh</option><option value="yi">Yiddish</option></select>'+
				'</div>'+
				'<div id="levelDialog">'+
				'<div>'+
				'Type<br/>'+
				'<input type="radio" value="a" name="level" id="level_a"/><label for="level_a">Analytic <span style="font-size: 8px;">(article, poem, or other item published as part of a larger item)</span></label><br/>'+
				'<input type="radio" value="m" name="level" id="level_m" checked="checked"/><label for="level_m">Monographic <span style="font-size: 8px;">(book, collection, single volume, or other item published as a distinct item)</span></label><br/>'+
				'<input type="radio" value="j" name="level" id="level_j"/><label for="level_j">Journal <span style="font-size: 8px;">(magazine, newspaper or other periodical publication)</span></label><br/>'+
				'<input type="radio" value="s" name="level" id="level_s"/><label for="level_s">Series <span style="font-size: 8px;">(book, radio, or other series)</span></label><br/>'+
				'<input type="radio" value="u" name="level" id="level_u"/><label for="level_u">Unpublished <span style="font-size: 8px;">(thesis, manuscript, letters or other unpublished material)</span></label><br/>'+
				'</div>'+
				'<div>'+
				'Equivalent title (optional) <input name="alt" type="text" /> <span style="font-size: 8px;">(standard form of title)</span>'+
				'</div>'+
				'<div>'+
				'Refer to text (optional) <input name="ref" type="text" />'+
				'</div>'+
				'<div>'+
				'<input type="checkbox" name="unformatted" id="unformatted"/>'+
				'<label for="unformatted">Unformatted</label>'+
				'</div>'+
				'</div>'
			);
			$('#levelDialog > div').css({marginBottom: '10px'});
			
			t.lang = $('#langDialog');
			t.level = $('#levelDialog');
			
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
			
			t.level.dialog({
				modal: true,
				resizable: false,
				closeOnEscape: false,
				open: function(event, ui) {
					$('#levelDialog').parent().find('.ui-dialog-titlebar-close').hide();
				},
				height: 310,
				width: 435,
				autoOpen: false,
				buttons: {
					'Ok': function() {
						levelResult();
					},
					'Cancel': function() {
						t.editor.selection.moveToBookmark(t.bm);
						t.level.dialog('close');
					}
				}
			});
			
			$('#langDialog select').keyup(function(event) {
				if (event.keyCode == '13') {
					event.preventDefault();
					langResult();
				}
			});
			
			$('#levelDialog input').keyup(function(event) {
				if (event.keyCode == '13') {
					event.preventDefault();
					levelResult();
				}
			});
			
			var langResult = function() {
				var lang = $('select[name="lang"]', t.lang).val();
				
				var params = {
					lang: lang,
					type: t.currentVal
				};
				
				if (t.currentVal == 'para') {
					params['class'] = 'paraTag';
				} else if (t.currentVal == 'quote') {
					var selection = t.editor.selection.getContent();
					if (selection.length > 250) {
						params['class'] = 'quoteTagLong';
					} else {
						params['class'] = 'quoteTagShort';
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
			
			var levelResult = function() {
				var level = $('input[name="level"]:checked', t.level).val();
				var ref = $('input[name="ref"]', t.level).val();
				var alt = $('input[name="alt"]', t.level).val();
				var unformatted = $('input[name="unformatted"]', t.level).attr('checked');
				
				var params = {
					type: t.currentVal,
					level: level,
					ref: ref,
					alt: alt,
					unformatted: unformatted
				};
				
				if (level == 'a' || level == 'u') {
					params['class'] = 'titleTagQuotes';
				} else if (level == 'm' || level == 'j' || level == 's') {
					params['class'] = 'titleTagItalics';
				}
				
				switch (t.mode) {
					case t.ADD:
						t.editor.execCommand('addStructureTag', t.bm, params);
						break;
					case t.EDIT:
						t.editor.execCommand('editStructureTag', t.tag, params);
						t.tag = null;
				}
				
				t.level.dialog('close');
			};
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
				var d = t.lang;
				if (val == 'title') d = t.level;
				
				var title = t.titles[val];
				d.dialog('option', 'title', title);
				if (pos) d.dialog('option', 'position', [pos.x, pos.y]);
				d.dialog('open');
			}
		},
		createControl: function(n, cm) {
			if (n == 'customtags') {
				var t = this;
				var url = t.url+'/../../img/';
				t.menuButton = cm.createSplitButton('customTagsButton', {
					title: 'Structural Tags',
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
//					m.add({
//						title: 'Title',
//						icon_src: url+'title.png',
//						onclick : function() {
//							t.editor.execCommand('addCustomTag', 'title');
//						}
//					});
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