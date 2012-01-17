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

<xsl:template name="string-replace-all">
  <xsl:param name="text" />
  <xsl:param name="replace" />
  <xsl:param name="by" />
  <xsl:choose>
    <xsl:when test="contains($text, $replace)">
      <xsl:value-of select="substring-before($text,$replace)" />
      <xsl:value-of select="$by" />
      <xsl:call-template name="string-replace-all">
        <xsl:with-param name="text"
        select="substring-after($text,$replace)" />
        <xsl:with-param name="replace" select="$replace" />
        <xsl:with-param name="by" select="$by" />
      </xsl:call-template>
    </xsl:when>
    <xsl:otherwise>
      <xsl:value-of select="$text" />
    </xsl:otherwise>
  </xsl:choose>
</xsl:template>

<xsl:template match="rng:define">
	<xsl:variable name="displayName">
		<xsl:call-template name="string-replace-all">
			<xsl:with-param name="text" select="@name"/>
			<xsl:with-param name="replace" select="'-element'"/>
			<xsl:with-param name="by" select="''"/>
		</xsl:call-template>
	</xsl:variable>
	<!-- xhtml requires element names to be lowercase -->
	"<xsl:value-of select="translate(rng:element/@name, $uppercase, $lowercase)"/>": {
	"displayName": "<xsl:value-of select="$displayName"/>",
	"attributes": [<xsl:apply-templates select="rng:element/rng:attribute | rng:element/*[local-name()='optional' or local-name()='choice' or local-name()='group']/rng:attribute"/>],
	"elements": [<xsl:apply-templates select="rng:element//rng:ref"/>]
}<xsl:if test="position() != last()">,</xsl:if>
</xsl:template>

<xsl:template match="rng:attribute">{
		<!-- xhtml requires attribute names to be lowercase -->
		"name": "<xsl:value-of select="translate(@name, $uppercase, $lowercase)"/>",
		"displayName": "<xsl:value-of select="@name"/>",
		"required": <xsl:value-of select="local-name(parent::node()) != 'optional'"/>
		<xsl:apply-templates select="rng:data"/><xsl:apply-templates select="rng:choice"/><xsl:apply-templates select="@a:defaultValue"/>
	}<xsl:if test="position() != last()">,</xsl:if>
</xsl:template>

<xsl:template match="rng:ref">{
		<xsl:variable name="displayName">
			<xsl:call-template name="string-replace-all">
				<xsl:with-param name="text" select="@name"/>
				<xsl:with-param name="replace" select="'-element'"/>
				<xsl:with-param name="by" select="''"/>
			</xsl:call-template>
		</xsl:variable>
		<!-- xhtml requires element names to be lowercase -->
		"name": "<xsl:value-of select="translate($displayName, $uppercase, $lowercase)"/>"
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