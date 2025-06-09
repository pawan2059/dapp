def handler(request, response):
    # JavaScript to disable developer tools (Fn+F12, Ctrl+Shift+I, Ctrl+U)
    security_script = """
    (function() {
        document.addEventListener('contextmenu', event => event.preventDefault());
        document.onkeydown = function(e) {
            // Detect F12 (including Fn+F12 on some keyboards)
            if (e.key === 'F12' || e.code === 'F12' || (e.location === 1 && e.key === 'F12')) {
                e.preventDefault();
                alert('Developer tools are disabled on this page.');
                return false;
            }
            // Detect Ctrl+Shift+I and Ctrl+U
            if ((e.ctrlKey && e.shiftKey && e.key === 'I') || (e.ctrlKey && e.key === 'U')) {
                e.preventDefault();
                alert('Developer tools are disabled on this page.');
                return false;
            }
        };
    })();
    """
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/javascript'},
        'body': security_script
    }
