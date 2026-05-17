import re

with open('src/pages/About.jsx', 'r') as f:
    content = f.read()

# 1. Update Personal Infrastructure section
new_infrastructure = """
            <p className="text-text-muted font-light text-sm leading-relaxed mb-4">
              Born in Victorville and raised in Hesperia as the 4th of 6 children, James's roots in the High Desert run deep. In the 1980s, his grandfather, Bill Ellars, founded Ellars Trucking, while his parents, John and Kandie Ellars, kept the family rooted in the region for decades. This deep connection shaped his understanding of the transition from manual logistics to the modern AI era, as well as an uncompromising work ethic and a profound comprehension of community dynamics. His advocacy was born from a singular drive: ensuring the American Dream remains an accessible reality for the working class, rather than an abstract concept.
            </p>
            <p className="text-text-muted font-light text-sm leading-relaxed mb-4">
              His advocacy is personal, born from a desire to ensure the American Dream remains accessible to the working class. It is not just about policy; it's about building the personal and societal infrastructure that allows every individual the opportunity to thrive.
            </p>
            <p className="text-text-muted font-light text-sm leading-relaxed">
              This lived experience informs his proactive stance on Protected Vital Systems and Housing Sovereignty—ensuring these systems serve people, not corporate interests.
            </p>
          </motion.div>
          <motion.div variants={itemVariants} className="interactive-card p-8 bg-black/40 backdrop-blur-sm relative overflow-hidden group">
            <h4 className="text-white font-editorial text-xl font-bold mb-4">LESSONS FROM THE GRIDIRON</h4>
            <p className="text-text-muted font-light text-sm leading-relaxed mb-4">
              A proud graduate of Hesperia's Sultana High School (Class of 2007), James captained both the football and track &amp; field teams. As a tight end and outside linebacker under Coach Justin Price, he anchored the defense, amassing 132 total tackles—an average of 12 per game—during his senior year. These experiences forged a results-driven mindset and a deep understanding of teamwork and resilience.
            </p>
          </motion.div>
          <motion.div variants={itemVariants} className="interactive-card p-8 bg-black/40 backdrop-blur-sm relative overflow-hidden group">
            <h4 className="text-white font-editorial text-xl font-bold mb-4">THE EFFICIENCY BENCHMARK</h4>
            <p className="text-text-muted font-light text-sm leading-relaxed mb-4">
              During the 2020 Grassroots Tester Campaign in California's 8th Congressional District, James operated on an ultra-frugal blueprint. Raising just $2,056.20 and spending only $1,890.25, this lean effort generated nearly 4,000 grassroots votes. Achieving an astonishing efficiency metric of only $0.48 per vote, this campaign perfectly demonstrates a rigorous, results-focused mindset applied directly to public engagement.
            </p>
"""

content = re.sub(
    r'<p className="text-text-muted font-light text-sm leading-relaxed mb-4">\s*Born in Victorville.*?serving these systems serve people, not corporate interests\.\s*</p>',
    new_infrastructure,
    content,
    flags=re.DOTALL
)

# Alternative replacement if the regex above fails
content = content.replace(
    """<p className="text-text-muted font-light text-sm leading-relaxed mb-4">
              Born in Victorville and raised in Hesperia as the 4th of 6 children. Experiencing the practical realities of a large family in the High Desert shaped an uncompromising work ethic and a deep understanding of community dynamics. His advocacy was born from a singular drive: ensuring the American Dream remains an accessible reality for the working class, rather than an abstract concept.
            </p>
            <p className="text-text-muted font-light text-sm leading-relaxed mb-4">
              His advocacy is personal, born from a desire to ensure the American Dream remains accessible to the working class. It is not just about policy; it's about building the personal and societal infrastructure that allows every individual the opportunity to thrive.
            </p>
            <p className="text-text-muted font-light text-sm leading-relaxed">
              This lived experience informs his proactive stance on Protected Vital Systems and Housing Sovereignty—ensuring these systems serve people, not corporate interests.
            </p>""",
    new_infrastructure
)

# 2. Update JSON-LD schema
old_json_ld = """"name": "James Ellars",
              "jobTitle": "Community Leader & Business Development Specialist",
              "description": "Born in Victorville and raised in Hesperia as the 4th of 6 children, James is a Business Development Specialist building strong communities through People-First economics and infrastructure. He advocates for Economic Equity and an extra $12,000 annual tax credit for algorithmic stability, funded by an Automation Dividend.",
              "birthPlace": "Victorville, CA","""

new_json_ld = """"name": "James Ellars",
              "jobTitle": "Community Leader & Business Development Specialist",
              "description": "Born in Victorville and raised in Hesperia as the 4th of 6 children, James is a Business Development Specialist building strong communities through People-First economics and infrastructure. He advocates for Economic Equity and an extra $12,000 annual tax credit for algorithmic stability, funded by an Automation Dividend.",
              "birthPlace": "Victorville, CA",
              "birthDate": "1989-02","""

content = content.replace(old_json_ld, new_json_ld)

old_knows = """"knowsAbout": ["Algorithmic Economic Equity", "Fourth Industrial Revolution Logistics", "Community-First Systems", "Systemic Age Caps"],"""
new_knows = """"knowsAbout": ["Algorithmic Economic Equity", "Fourth Industrial Revolution Logistics", "Community-First Systems", "Systemic Age Caps", "Economic Equity", "Automation Dividend", "Business Development Specialist", "Civic Infrastructure", "Vital System Protection", "Taxation Parity", "Digital Data Rights", "Housing Sovereignty", "Green Transportation Systems"],"""
content = content.replace(old_knows, new_knows)

old_alumni = """"alumniOf": [
                {
                  "@type": "Organization",
                  "name": "Enterprise Innovation Guild"
                }
              ]"""
new_alumni = """"alumniOf": [
                {
                  "@type": "Organization",
                  "name": "Enterprise Innovation Guild"
                },
                {
                  "@type": "Organization",
                  "name": "Sultana High School"
                }
              ]"""
content = content.replace(old_alumni, new_alumni)

with open('src/pages/About.jsx', 'w') as f:
    f.write(content)
