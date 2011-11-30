<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="1.0"
	xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
	xmlns:rng="http://relaxng.org/ns/structure/1.0"
	exclude-result-prefixes=""
	>

<xsl:output method="xml" indent="yes"/>

<xsl:template match="/">
	<grammar>
	<xsl:apply-templates/>
	</grammar>
</xsl:template>

<xsl:template match="rng:define[
	./rng:element/@name!='CHRONEVENT' and
	./rng:element/@name!='DATE' and
	./rng:element/@name!='DATESTRUCT' and
	./rng:element/@name!='DATERANGE' and
	./rng:element/@name!='NAME' and
	./rng:element/@name!='ORGNAME' and
	./rng:element/@name!='PLACE' and
	./rng:element/@name!='TITLE' and
	./rng:element/@name!='BIBCIT' and
	./rng:element/@name!='SCHOLARNOTE' and
	./rng:element/@name!='RESEARCHNOTE' and
	./rng:element/@name!='CHONPROSE' and
	./rng:element/@name!='P' and
	./rng:element/@name!='HEADING' and
	./rng:element/@name!='EMPH' and
	./rng:element/@name!='FOREIGN' and
	./rng:element/@name!='QUOTE' and
	./rng:element/@name!='LB'
	]">
	<!-- Add next line to conditions to remove definitions with sub elements -->
	<!-- count(.//rng:ref[contains(@name, 'element')]) = 0 -->
	<xsl:copy>
	<xsl:apply-templates select="@*" mode="define"/>
	<xsl:apply-templates mode="define"/>
	</xsl:copy>
</xsl:template>

<xsl:template match="*|text()|@*" mode="define">
<xsl:choose>
<xsl:when test="local-name(.) = 'ref'"> <!-- and not(contains(./@name, 'inclusion'))"> -->
<xsl:variable name="refName" select="./@name"/>
<xsl:comment>Inserted <xsl:value-of select="$refName"/></xsl:comment>
<xsl:copy-of select="//rng:define[@name=$refName]/*"/>
<!-- Next line commented out to prevent endless recursion -->
<!-- xsl:apply-templates select="//rng:define[@name=$refName]/*" mode="define"/ -->
</xsl:when>
<xsl:otherwise>
<xsl:copy>
	<xsl:apply-templates select="@*" mode="define"/>
	<xsl:apply-templates mode="define"/>
</xsl:copy>
</xsl:otherwise>
</xsl:choose>
</xsl:template>

<xsl:template match="text()"></xsl:template>

</xsl:stylesheet>