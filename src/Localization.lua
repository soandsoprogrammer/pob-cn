local translations = dofile("LocalizationData.lua")

local function translateSingle(text)
	if type(text) ~= "string" or text == "" then
		return text
	end
	local direct = translations[text]
	if direct then
		return direct
	end
	local prefixes = ""
	local body = text
	while true do
		local prefix, remainder = body:match("^(%^x%x%x%x%x%x%x)(.*)$")
		if not prefix then
			prefix, remainder = body:match("^(%^[0-9])(.*)$")
		end
		if not prefix then
			break
		end
		prefixes = prefixes .. prefix
		body = remainder
	end
	if prefixes ~= "" and translations[body] then
		return prefixes .. translations[body]
	end
	return text
end

local function translatePlain(text)
	local whole = translateSingle(text)
	if whole ~= text or type(text) ~= "string" or not text:find("\n", 1, true) then
		return whole
	end
	local translated = {}
	local start = 1
	while true do
		local lineEnd = text:find("\n", start, true)
		if lineEnd then
			translated[#translated + 1] = translateSingle(text:sub(start, lineEnd - 1))
			translated[#translated + 1] = "\n"
			start = lineEnd + 1
		else
			translated[#translated + 1] = translateSingle(text:sub(start))
			break
		end
	end
	return table.concat(translated)
end

TranslateZH = translatePlain

local nativeDrawString = DrawString
local nativeDrawStringWidth = DrawStringWidth

DrawString = function(x, y, align, height, font, text, ...)
	return nativeDrawString(x, y, align, height, font, translatePlain(text), ...)
end

DrawStringWidth = function(height, font, text, ...)
	return nativeDrawStringWidth(height, font, translatePlain(text), ...)
end
