(function(tinymce) {
	tinymce.create('tinymce.plugins.CustomTags', {
		init: function(ed, url) {
			var t = this;
			t.url = url;
			t.editor = ed;
			t.currentVal = null;
			t.bm = null;
			
			ed.addCommand('addCustomTag', function(val) {
				var se = t.editor.selection;

				if (se.isCollapsed()) return;
				
				// reset values
				$('select[name="lang"]')[0].value = '';
				$('select[name="level"]')[0].value = '';
				$('input[name="ref"]')[0].value = '';
				$('select[name="level"]').css({borderColor: ''});
				
				t.currentVal = val;
				if (val == 'head') {
					t.addTag('span', {
						'class': 'headTag'
					});
				} else if (val == 'emph') {
					t.addTag('span', {
						'class': 'emphTag'
					});
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
					
					var title = '';
					for (var i = 0; i < t.box.items.length; i++) {
						var item = t.box.items[i];
						if (item.value == val) {
							title = item.title;
							break;
						}
					}
					t.d.dialog('option', 'title', title);
					t.d.dialog('open');
				}
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
				closeOnEscape: true,
				height: 150,
				width: 325,
				autoOpen: false,
				buttons: {
					'Ok': function() {
						var lang = $('select[name="lang"]')[0].value;
						var level = $('select[name="level"]')[0].value;
						var ref = $('input[name="ref"]')[0].value;
						
						if (t.currentVal == 'para') {
							t.addTag('span', {
								'class': 'paraTag',
								lang: lang
							});
						} else if (t.currentVal == 'title') {
							if (level == 'a' || level == 'u') {
								t.addTag('span', {
									'class': 'titleTagQuotes',
									level: level,
									ref: ref
								});
							} else if (level == 'm' || level == 'j' || level == 's') {
								t.addTag('span', {
									'class': 'titleTagItalics',
									level: level,
									ref: ref
								});
							} else {
								$('select[name="level"]').css({borderColor: 'red'});
								return false;
							}
						} else if (t.currentVal == 'quote') {
							var selection = t.editor.selection.getContent();
							if (selection.length > 250) {
								t.addTag('span', {
									'class': 'quoteTagLong',
									lang: lang
								});
							} else {
								t.addTag('span', {
									'class': 'quoteTagShort',
									lang: lang
								});
							}
						}
						t.d.dialog('close');
					},
					'Cancel': function() {
						t.d.dialog('close');
					}
				}
			});
		},
		addTag: function(tag, attributes) {
			var open_tag, close_tag;
			var selection = this.editor.selection.getContent();
			open_tag = '<'+tag;
			for (var key in attributes) {
				open_tag += ' '+key+'="'+attributes[key]+'"';
			}
			open_tag += '>';
			close_tag = '</'+tag+'>';
			var content = open_tag + selection + close_tag;
			this.editor.execCommand('mceReplaceContent', false, content);
		},
		createControl: function(n, cm) {
			if (n == 'customtags') {
				var t = this;
				t.box = cm.createListBox('customTagsMenu', {
					title: 'Tags',
					onselect: function(val) {
						t.editor.execCommand('addCustomTag', val);
					}
				});
				
				t.box.add('Paragraph', 'para');
				t.box.add('Heading', 'head');
				t.box.add('Emphasized', 'emph');
				t.box.add('Title', 'title');
				t.box.add('Quotation', 'quote');
				
				return t.box;
			}
	
			return null;
		}
	});
	
	tinymce.PluginManager.add('customtags', tinymce.plugins.CustomTags);
})(tinymce);