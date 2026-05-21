import { useState, useRef } from "react";

const TOPICS = [
  {id:1,name:"Introduction to Arts Education: Concepts and Scope",course:"EDA 105",description:"Overview of arts education its meaning history and relevance in Nigerian schools"},
  {id:2,name:"Philosophy and Objectives of Arts Education",course:"EDA 105",description:"Philosophical foundations and national objectives guiding arts education in Nigeria"},
  {id:3,name:"The Arts as a Medium of Expression and Communication",course:"EDA 105",description:"How visual performing and literary arts function as human communication tools"},
  {id:4,name:"Arts Education in the Nigerian Curriculum",course:"EDA 105",description:"Review of arts education placement in primary secondary and tertiary curricula"},
  {id:5,name:"Creative Development in Children through Arts",course:"EDA 105",description:"Stages of artistic development and how arts foster creativity in learners"},
  {id:6,name:"Interdisciplinary Nature of Arts Education",course:"EDA 105",description:"Connections between arts music drama and other subject areas"},
  {id:7,name:"Career Opportunities and Professional Ethics in Arts Education",course:"EDA 105",description:"Pathways and ethical responsibilities for arts educators in Nigeria"},
  {id:8,name:"Culture: Definition Dimensions and Characteristics",course:"EDA 106",description:"Meaning components and distinguishing features of culture in African societies"},
  {id:9,name:"Arts and Culture: Points of Intersection",course:"EDA 106",description:"How artistic production reflects transmits and transforms cultural values"},
  {id:10,name:"Nigerian Cultural Heritage and Arts Traditions",course:"EDA 106",description:"Survey of indigenous arts crafts music and performance traditions across Nigeria"},
  {id:11,name:"Colonialism and Its Impact on Nigerian Arts and Culture",course:"EDA 106",description:"How colonial rule disrupted and reshaped Nigerian arts and cultural expression"},
  {id:12,name:"Cultural Identity and Representation in the Arts",course:"EDA 106",description:"The role of arts in affirming preserving and projecting cultural identity"},
  {id:13,name:"Globalization and Contemporary Nigerian Arts",course:"EDA 106",description:"Influence of global culture on modern Nigerian artistic production and consumption"},
  {id:14,name:"Cultural Policy and Institutions in Nigeria",course:"EDA 106",description:"National cultural policy NCAC and the institutional framework supporting arts and culture"},
  {id:15,name:"Communicative Language Teaching (CLT) in Nigerian Classrooms",course:"EDA 222",description:"Principles of CLT and how to adapt communicative methods to Nigerian secondary school contexts"},
  {id:16,name:"Task-Based Language Teaching (TBLT) and Activity Design",course:"EDA 222",description:"Designing meaningful language tasks and sequencing them for effective learning outcomes"},
  {id:17,name:"Lesson Planning and Instructional Objectives in English Teaching",course:"EDA 222",description:"Writing behavioural objectives and structuring lesson plans for English language classes"},
  {id:18,name:"Use of Instructional Materials and Improvisation Techniques",course:"EDA 222",description:"Selecting adapting and improvising teaching aids for resource-limited Nigerian classrooms"},
  {id:19,name:"Teaching Grammar in Context vs Isolation",course:"EDA 222",description:"Comparing deductive and inductive grammar teaching and contextualised grammar instruction"},
  {id:20,name:"Classroom Interaction Patterns and Questioning Techniques",course:"EDA 222",description:"IRF patterns wait time and higher-order questioning strategies for English lessons"},
  {id:21,name:"Assessment Strategies in English Language Teaching",course:"EDA 222",description:"Formative and summative assessment types including WAEC-aligned evaluation approaches"},
  {id:22,name:"Listening Skills: Processes Barriers and Teaching Strategies",course:"EDA 226",description:"Stages of the listening process common classroom barriers and pedagogical remedies"},
  {id:23,name:"Speaking Skills: Pronunciation Fluency and Classroom Practice",course:"EDA 226",description:"Teaching spoken English with focus on Nigerian phonology fluency development and oral drills"},
  {id:24,name:"Reading Skills: Skimming Scanning and Intensive Reading",course:"EDA 226",description:"Strategies for reading comprehension and how to teach different reading purposes"},
  {id:25,name:"Writing Skills: Composition Coherence and Cohesion",course:"EDA 226",description:"Teaching paragraph writing essay structure coherence devices and cohesive ties"},
  {id:26,name:"Integrated Language Skills Approach",course:"EDA 226",description:"Combining listening speaking reading and writing in unified and authentic language tasks"},
  {id:27,name:"Teaching Vocabulary and Semantic Development",course:"EDA 226",description:"Methods for vocabulary instruction including context clues word maps and collocations"},
  {id:28,name:"Study Skills and Note-Taking Techniques",course:"EDA 226",description:"Teaching learners how to take effective notes summarise texts and prepare for examinations"},
  {id:29,name:"Microteaching: Concept Phases and Skill Acquisition",course:"EDA 325",description:"Definition rationale and the plan teach re-plan cycle in microteaching for pre-service teachers"},
  {id:30,name:"Lesson Plan Development and Delivery",course:"EDA 325",description:"Step-by-step construction of detailed lesson plans and live delivery techniques"},
  {id:31,name:"Classroom Management Techniques for Student Teachers",course:"EDA 325",description:"Strategies for maintaining order engagement and a positive learning environment"},
  {id:32,name:"Observation Techniques and Reflective Practice",course:"EDA 325",description:"Using structured observation instruments and reflective journals to improve teaching"},
  {id:33,name:"Use of Teaching Aids and Instructional Media",course:"EDA 325",description:"Selecting and integrating charts realia audio-visual materials and digital tools in lessons"},
  {id:34,name:"Teacher-Student Interaction and Communication Skills",course:"EDA 325",description:"Verbal and non-verbal communication proxemics and building rapport in classrooms"},
  {id:35,name:"Evaluation and Feedback in Teaching Practice",course:"EDA 325",description:"Supervisor and peer feedback methods self-evaluation and professional growth planning"},
  {id:36,name:"Advanced Lesson Delivery and Classroom Control",course:"EDA 316",description:"Techniques for confident expert delivery and managing disruptive behaviour in large classes"},
  {id:37,name:"Differentiated Instruction in Language Classrooms",course:"EDA 316",description:"Adapting content process and product to meet diverse learner needs and abilities"},
  {id:38,name:"Teaching Large Classes in Nigerian Secondary Schools",course:"EDA 316",description:"Practical strategies for maintaining quality instruction with 50+ students per class"},
  {id:39,name:"Error Analysis and Correction Techniques",course:"EDA 316",description:"Identifying categorising and responding to learner errors without impeding fluency"},
  {id:40,name:"Use of ICT Tools in Language Teaching (e-learning and CBT)",course:"EDA 316",description:"Integrating Moodle CBT platforms and digital resources into language instruction"},
  {id:41,name:"Continuous Assessment and Record Keeping",course:"EDA 316",description:"Designing CA instruments maintaining accurate records and interpreting scores for reporting"},
  {id:42,name:"Professional Ethics and Teacher Identity Development",course:"EDA 316",description:"NTI/TRCN standards ethics of the teaching profession and building a professional identity"},
  {id:43,name:"Concept and Theories of Moral Development",course:"EDA 447",description:"Overview of Piaget Kohlberg and Gilligan theories of moral development with classroom applications"},
  {id:44,name:"Values Education in Nigerian Society",course:"EDA 447",description:"Core national values and how schools transmit them through curriculum and school culture"},
  {id:45,name:"Role of School and Family in Moral Formation",course:"EDA 447",description:"Partnership between home and school in shaping character and ethical behaviour in children"},
  {id:46,name:"Teaching Honesty Integrity and Responsibility",course:"EDA 447",description:"Instructional strategies for inculcating key virtues in primary and secondary school learners"},
  {id:47,name:"Moral Dilemmas and Decision-Making Skills",course:"EDA 447",description:"Using case studies and dilemma discussions to develop ethical reasoning in students"},
  {id:48,name:"Religion Culture and Moral Instruction",course:"EDA 447",description:"How religious and cultural values intersect with formal moral education in Nigerian schools"},
  {id:49,name:"Discipline Character Building and Civic Responsibility",course:"EDA 447",description:"Approaches to school discipline civic education and building responsible future citizens"},
  {id:50,name:"Behaviorist Theory (B. F. Skinner) and Language Learning",course:"EDA 424",description:"Stimulus-response conditioning reinforcement schedules and their role in language habit formation"},
  {id:51,name:"Nativist Theory (Noam Chomsky) and Universal Grammar",course:"EDA 424",description:"Language acquisition device critical period hypothesis and implications for language teaching"},
  {id:52,name:"Cognitive Theory in Language Acquisition",course:"EDA 424",description:"Information processing schema theory and problem-solving approaches to language learning"},
  {id:53,name:"Constructivist Theory (Jean Piaget)",course:"EDA 424",description:"Stages of cognitive development assimilation accommodation and active learning in language classes"},
  {id:54,name:"Socio-cultural Theory (Lev Vygotsky)",course:"EDA 424",description:"Zone of proximal development scaffolding and collaborative learning in language acquisition"},
  {id:55,name:"Krashen's Monitor Model",course:"EDA 424",description:"The five hypotheses of Krashen and their practical implications for EFL/ESL classroom instruction"},
  {id:56,name:"Humanistic Approaches in Language Teaching",course:"EDA 424",description:"Community Language Learning Silent Way Suggestopedia and the affective filter in learning"},
  {id:57,name:"Research Design and Methodology in Education",course:"EDA 490",description:"Types of educational research experimental survey and qualitative designs and their applications"},
  {id:58,name:"Writing Chapter One: Introduction to Research",course:"EDA 490",description:"Formulating research problems background purpose research questions and significance of study"},
  {id:59,name:"Literature Review and Theoretical Framework",course:"EDA 490",description:"How to search synthesise and critically review related literature and select a guiding theory"},
  {id:60,name:"Data Collection Methods: Questionnaire Interview and Observation",course:"EDA 490",description:"Designing valid and reliable instruments for primary data collection in education research"},
  {id:61,name:"Data Analysis Techniques: Qualitative and Quantitative",course:"EDA 490",description:"Descriptive statistics SPSS basics thematic analysis and content analysis for education data"},
  {id:62,name:"Report Writing and Referencing Styles (APA and MLA)",course:"EDA 490",description:"Structuring final research reports and correctly applying APA 7th edition referencing"},
  {id:63,name:"Presentation and Defense of Research Project",course:"EDA 490",description:"Preparing and delivering a confident oral defense of an undergraduate research project"},
  {id:64,name:"Ethics and Professionalism in Teaching",course:"EDA 425",description:"Professional conduct dress code and ethical boundaries in school settings"},
  {id:65,name:"Lesson Delivery and Classroom Control",course:"EDA 425",description:"Techniques for engaging students and maintaining discipline during practice"},
  {id:66,name:"Instructional Media and Resource Management",course:"EDA 425",description:"Selection and use of teaching aids in a real classroom environment"},
  {id:67,name:"Student Assessment and Record Keeping",course:"EDA 425",description:"Managing attendance registers mark sheets and progress reports"},
  {id:68,name:"Reflective Journaling and Peer Observation",course:"EDA 425",description:"Analyzing teaching experiences and learning from mentor observations"},
  {id:69,name:"Community and Staff Relationships",course:"EDA 425",description:"Interacting with host teachers school management and parents"},
  {id:70,name:"Post-TP Evaluation and Portfolio Defense",course:"EDA 425",description:"Summarizing field experiences and defending pedagogical choices"},
];

const BATCH_SIZE = 7;

function escapeCSV(str) {
  if (str === null || str === undefined) return "";
  const s = String(str).replace(/"/g, '""');
  return `"${s}"`;
}

export default function NoteGenerator() {
  const [generated, setGenerated] = useState({});
  const [status, setStatus] = useState("idle");
  const [currentBatch, setCurrentBatch] = useState(0);
  const [log, setLog] = useState([]);
  const [error, setError] = useState(null);
  const abortRef = useRef(false);

  const totalBatches = Math.ceil(TOPICS.length / BATCH_SIZE);
  const doneCount = Object.keys(generated).length;

  const addLog = (msg) => setLog(prev => [...prev, msg]);

  const generateBatch = async (batchTopics) => {
    const prompt = `You are writing university-level lecture notes for undergraduate students in Arts Education at the University of Nigeria, Nsukka. 

For each topic below, write comprehensive, in-depth lecture notes in HTML format. Each note must:
- Be 600-900 words of actual educational content
- Follow this exact HTML structure:
  <h2>[Topic Name] ([Course Code])</h2>
  <h3>Introduction</h3><p>...</p>
  <h3>Key Concepts</h3><p>...</p>
  <h3>Theoretical Framework</h3><p>...</p>
  <h3>Nigerian Context and Application</h3><p>...</p>
  <h3>Practical Classroom Implications</h3><p>...</p>
  <h3>Summary</h3><p>...</p>
  <h3>References</h3><ul class='references'><li>...</li></ul>
- Use real scholars, theorists and Nigerian educational researchers (cite 4-6 real references)
- Be unique — no two topics should sound the same
- Be specific to the topic description provided
- Use <strong> for key terms on first use

Respond ONLY with a JSON array, no markdown, no backticks:
[
  {"id": 1, "content": "<h2>...</h2>..."},
  ...
]

Topics to generate:
${batchTopics.map(t => `ID ${t.id}: "${t.name}" (${t.course}) — ${t.description}`).join("\n")}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8000,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data = await response.json();
    const text = data.content.map(b => b.text || "").join("").trim()
      .replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
    return JSON.parse(text);
  };

  const startGeneration = async () => {
    abortRef.current = false;
    setStatus("running");
    setError(null);

    for (let i = 0; i < totalBatches; i++) {
      if (abortRef.current) break;
      setCurrentBatch(i + 1);
      const batch = TOPICS.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
      addLog(`⏳ Generating batch ${i + 1}/${totalBatches} (topics ${batch[0].id}–${batch[batch.length-1].id})...`);

      try {
        const results = await generateBatch(batch);
        setGenerated(prev => {
          const updated = { ...prev };
          results.forEach(r => { updated[r.id] = r.content; });
          return updated;
        });
        addLog(`✅ Batch ${i + 1} done — ${results.length} notes generated`);
        // Small delay between batches to be safe
        if (i < totalBatches - 1) await new Promise(r => setTimeout(r, 1500));
      } catch (err) {
        setError(`Batch ${i + 1} failed: ${err.message}`);
        addLog(`❌ Batch ${i + 1} failed: ${err.message}`);
        setStatus("error");
        return;
      }
    }

    setStatus("done");
    addLog(`🎉 All ${TOPICS.length} notes generated successfully!`);
  };

  const downloadCSV = () => {
    const header = "id,topic,content,pdf_file,created_by,updated_by";
    const rows = TOPICS.map(t => {
      const content = generated[t.id] || "";
      return [t.id, t.id, escapeCSV(content), "", 1, 1].join(",");
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "FINAL_MASTER_NOTES.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const progress = Math.round((doneCount / TOPICS.length) * 100);

  return (
    <div style={{ fontFamily: "'Georgia', serif", minHeight: "100vh", background: "#0f1117", color: "#e8e6e1", padding: "2rem" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div style={{ marginBottom: "2rem", borderBottom: "1px solid #2a2d3a", paddingBottom: "1.5rem" }}>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: "#f0c060", marginBottom: "0.4rem", letterSpacing: "-0.02em" }}>
            AESA Lecture Note Generator
          </h1>
          <p style={{ color: "#8b8fa8", fontSize: "0.9rem", margin: 0 }}>
            Generates 70 in-depth university-level lecture notes across 10 courses · {BATCH_SIZE} topics per batch · {totalBatches} batches total
          </p>
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
          {[
            { label: "Total Topics", value: TOPICS.length },
            { label: "Generated", value: doneCount },
            { label: "Remaining", value: TOPICS.length - doneCount },
          ].map(s => (
            <div key={s.label} style={{ background: "#1a1d27", borderRadius: 8, padding: "1rem", textAlign: "center", border: "1px solid #2a2d3a" }}>
              <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#f0c060" }}>{s.value}</div>
              <div style={{ fontSize: "0.75rem", color: "#6b6f82", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div style={{ background: "#1a1d27", borderRadius: 8, overflow: "hidden", marginBottom: "1.5rem", border: "1px solid #2a2d3a" }}>
          <div style={{ height: 8, background: "#f0c060", width: `${progress}%`, transition: "width 0.4s ease" }} />
        </div>
        <div style={{ textAlign: "center", color: "#8b8fa8", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
          {progress}% complete {status === "running" && `· Batch ${currentBatch}/${totalBatches}`}
        </div>

        {/* Controls */}
        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          <button
            onClick={startGeneration}
            disabled={status === "running" || status === "done"}
            style={{
              padding: "0.7rem 1.5rem", borderRadius: 6, border: "none", cursor: status === "running" || status === "done" ? "not-allowed" : "pointer",
              background: status === "running" ? "#3a3d4a" : "#f0c060", color: status === "running" ? "#6b6f82" : "#0f1117",
              fontWeight: 700, fontSize: "0.9rem", letterSpacing: "0.02em"
            }}
          >
            {status === "running" ? "⏳ Generating..." : status === "done" ? "✅ Complete" : "▶ Generate All Notes"}
          </button>

          {status === "running" && (
            <button onClick={() => { abortRef.current = true; setStatus("paused"); }}
              style={{ padding: "0.7rem 1.5rem", borderRadius: 6, border: "1px solid #e05555", background: "transparent", color: "#e05555", cursor: "pointer", fontWeight: 600, fontSize: "0.9rem" }}>
              ⏸ Pause
            </button>
          )}

          {(status === "paused" || status === "error") && doneCount > 0 && (
            <button onClick={startGeneration}
              style={{ padding: "0.7rem 1.5rem", borderRadius: 6, border: "1px solid #f0c060", background: "transparent", color: "#f0c060", cursor: "pointer", fontWeight: 600, fontSize: "0.9rem" }}>
              ↺ Resume
            </button>
          )}

          {doneCount > 0 && (
            <button onClick={downloadCSV}
              style={{ padding: "0.7rem 1.5rem", borderRadius: 6, border: "none", background: "#2a5c3f", color: "#7fffc0", cursor: "pointer", fontWeight: 700, fontSize: "0.9rem" }}>
              ⬇ Download CSV ({doneCount}/{TOPICS.length})
            </button>
          )}
        </div>

        {error && (
          <div style={{ background: "#2a1a1a", border: "1px solid #e05555", borderRadius: 8, padding: "1rem", marginBottom: "1rem", color: "#e05555", fontSize: "0.85rem" }}>
            {error}
          </div>
        )}

        {/* Log */}
        <div style={{ background: "#0a0c12", borderRadius: 8, border: "1px solid #1e2130", padding: "1rem", maxHeight: 280, overflowY: "auto", fontFamily: "monospace", fontSize: "0.8rem" }}>
          {log.length === 0
            ? <span style={{ color: "#3a3d4a" }}>Logs will appear here...</span>
            : log.map((l, i) => <div key={i} style={{ color: l.startsWith("✅") ? "#7fffc0" : l.startsWith("❌") ? "#e05555" : l.startsWith("🎉") ? "#f0c060" : "#8b8fa8", marginBottom: "0.25rem" }}>{l}</div>)
          }
        </div>

        {/* Preview last generated */}
        {doneCount > 0 && (
          <div style={{ marginTop: "1.5rem", background: "#1a1d27", borderRadius: 8, border: "1px solid #2a2d3a", padding: "1.25rem" }}>
            <div style={{ fontSize: "0.75rem", color: "#6b6f82", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>
              Preview — last generated note
            </div>
            <div
              style={{ fontSize: "0.82rem", color: "#c8c5be", lineHeight: 1.7, maxHeight: 200, overflowY: "auto" }}
              dangerouslySetInnerHTML={{ __html: generated[Math.max(...Object.keys(generated).map(Number))] || "" }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
