describe('The FileManager', function() {
	it('should exist', function() {
		writer = new Writer();
		writer.init();
		expect(writer.fm).toBeDefined();
	});
	
	it('should display documents', function() {
		writer = new Writer();
		writer.init();
		writer.fm.openLoader();
	});
});