var NoteDialog = function(config) {
	var w = config.writer;
	
	var noteEditor = null;
	
	var currentType = null;
	
	var mode = null;
	var ADD = 0;
	var EDIT = 1;
	
	$(document.body).append(''+
	'<div id="noteDialog">'+
		'<div id="note_type"><p>Type</p>'+
		'<input type="radio" id="note_re" name="type" value="research" /><label for="note_re" title="Internal to projects">Research Note</label>'+
		'<input type="radio" id="note_scho" name="type" value="scholarly" /><label for="note_scho" title="Footnotes/endnotes">Scholarly Note</label>'+
		'<input type="radio" id="note_ann" name="type" value="annotation" /><label for="note_ann" title="Informal notes">Annotation</label>'+
		'<input type="radio" id="note_trans" name="type" value="translation" /><label for="note_trans">Translation</label>'+
		'</div>'+
	    '<textarea id="note_textarea"></textarea>'+
	    '<div id="note_access"><p>Access</p>'+
		'<input type="radio" id="note_pub" name="access" value="public" /><label for="note_pub">Public</label>'+
		'<input type="radio" id="note_pro" name="access" value="project" /><label for="note_pro">Project</label>'+
		'<input type="radio" id="note_pri" name="access" value="private" /><label for="note_pri">Private</label>'+
		'</div>'+
	'</div>');
	
	var note = $('#noteDialog');
	note.dialog({
		modal: true,
		resizable: false,
		closeOnEscape: false,
		open: function(event, ui) {
			$('#noteDialog').parent().find('.ui-dialog-titlebar-close').hide();
		},
		height: 450,
		width: 405,
		autoOpen: false,
		buttons: {
			'Tag Note': function() {
				noteResult();
			},
			'Cancel': function() {
				noteResult(true);
			}
		}
	});
	$('#note_type, #note_access').buttonset();

	$('#note_textarea').tinymce({
		script_url : 'js/tinymce/jscripts/tiny_mce/tiny_mce.js',
		height: '225',
		width: '380',
		theme: 'advanced',
		theme_advanced_buttons1: 'bold,italic,underline,strikethrough,|,justifyleft,justifycenter,justifyright,justifyfull,|,bullist,numlist,|,formatselect',
		theme_advanced_buttons2: '',
		theme_advanced_buttons3: '',
		theme_advanced_toolbar_location : 'top',
	    theme_advanced_toolbar_align : 'left',
		theme_advanced_path: false,
		theme_advanced_statusbar_location: 'none',
		setup: function(ed) {
			noteEditor = ed;
		}
	});
	
	var noteResult = function(cancelled) {
		var data = null;
		if (!cancelled) {
			var content = w.escapeHTMLString(noteEditor.getContent());
			var data = {
				content: content,
				type: $('#note_type input:checked').val(),
				access: $('#note_access input:checked').val()
			};
		}
		tinyMCE.activeEditor = tinyMCE.selectedInstance = w.editor; // make sure original editor is active
		if (mode == EDIT && data != null) {
			w.editEntity(w.editor.currentEntity, data);
		} else {
			w.finalizeEntity(currentType, data);
		}
		note.dialog('close');
		currentType = null;
	};
	
	return {
		show: function(config) {
			currentType = config.type;
			mode = config.entry ? EDIT : ADD;
			var prefix = 'Add ';
			
			if (mode == ADD) {
				$('#note_type input:eq(0)').click();
				$('#note_access input:eq(0)').click();
				noteEditor.setContent('');
			} else {
				prefix = 'Edit ';
				$('#note_type input[value="'+config.entry.info.type+'"]').click();
				$('#note_access input[value="'+config.entry.info.access+'"]').click();
				var content = w.unescapeHTMLString(config.entry.info.content);
				noteEditor.setContent(content);
			}
			
			var title = prefix+config.title;
			note.dialog('option', 'title', title);
			if (config.pos) {
				note.dialog('option', 'position', [config.pos.x, config.pos.y]);
			} else {
				note.dialog('option', 'position', 'center');
			}
			note.dialog('open');
		},
		hide: function() {
			note.dialog('close');
		}
	};
};