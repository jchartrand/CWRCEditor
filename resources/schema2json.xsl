<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="1.0"
	xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
	xmlns:rng="http://relaxng.org/ns/structure/1.0"
	xmlns:a="http://relaxng.org/ns/compatibility/annotations/1.0"
	exclude-result-prefixes=""
	>
<xsl:output method="text" omit-xml-declaration="yes"/>
<xsl:variable name="lowercase" select="'abcdefghijklmnopqrstuvwxyz'" />
<xsl:variable name="uppercase" select="'ABCDEFGHIJKLMNOPQRSTUVWXYZ'" />
<xsl:template match="/">
[{<xsl:apply-templates select="//rng:define"/>}];
</xsl:template>

<xsl:template match="rng:define">
	"<xsl:value-of select="@name"/>": {
	"elementName": "<xsl:value-of select="rng:element/@name"/>",
	"displayName": "<xsl:value-of select="@name"/>",
	"attributes": [<xsl:apply-templates select="rng:element/rng:attribute | rng:element/*[local-name()='optional' or local-name()='choice' or local-name()='group']/rng:attribute"/>]
}<xsl:if test="position() != last()">,</xsl:if>
</xsl:template>

<xsl:template match="rng:attribute">{
		"name": "<xsl:value-of select="translate(@name, $uppercase, $lowercase)"/>",<!-- attribute names must be in lower case or tinymce will remove them -->
		"displayName": "<xsl:value-of select="@name"/>",
		"required": <xsl:value-of select="local-name(parent::node()) != 'optional'"/>
		<xsl:apply-templates select="rng:data"/><xsl:apply-templates select="rng:choice"/><xsl:apply-templates select="@a:defaultValue"/>
	}<xsl:if test="position() != last()">,</xsl:if>
</xsl:template>

<xsl:template match="rng:data">,
		"dataType": "<xsl:value-of select="@type"/>"</xsl:template>

<xsl:template match="rng:choice">,
		"values": [<xsl:apply-templates select="rng:value"/>]</xsl:template>

<xsl:template match="rng:value">"<xsl:value-of select="."/>"<xsl:if test="position() != last()">, </xsl:if></xsl:template>

<xsl:template match="@a:defaultValue">,
		"defaultValue": "<xsl:value-of select="."/>"</xsl:template>

</xsl:stylesheet>