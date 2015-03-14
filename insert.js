insertScript(chrome.extension.getURL("main.js"));

function insertScript(file)
{
	var s = document.createElement("script");
	s.setAttribute("type", "text/javascript");
	s.setAttribute("src", file);
	var bodies = document.getElementsByTagName("body");
	if (bodies.length != 0)
	{
		bodies[0].appendChild(s);
	}
}
