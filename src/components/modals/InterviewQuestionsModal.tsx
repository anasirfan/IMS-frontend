import { motion } from 'framer-motion';
import { X, Sparkles, CheckCircle } from 'lucide-react';

interface InterviewQuestionsModalProps {
  show: boolean;
  onClose: () => void;
  questions: any;
  candidateName: string;
}

export default function InterviewQuestionsModal({ show, onClose, questions, candidateName }: InterviewQuestionsModalProps) {
  if (!show || !questions) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="text-blue-400" size={20} />
            <h3 className="text-lg font-semibold text-gray-100">Interview Questions for {candidateName}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        <p className="text-xs text-gray-400 mb-6">
          AI-generated interview questions based on CV analysis
        </p>

        <div className="space-y-6">
          {questions.questions && questions.questions.map((q: any, index: number) => (
            <div key={index} className="p-4 bg-glass-white5 border border-glass-border rounded-lg">
              <div className="flex items-start gap-2 mb-3">
                <span className="text-blue-400 font-bold text-sm">{index + 1}.</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-200 mb-1">{q.question}</p>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {q.category}
                  </span>
                  {q.difficulty && (
                    <span className={`ml-2 text-[10px] px-2 py-0.5 rounded ${
                      q.difficulty === 'Easy' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                      q.difficulty === 'Medium' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                      'bg-red-500/20 text-red-300 border border-red-500/30'
                    }`}>
                      {q.difficulty}
                    </span>
                  )}
                </div>
              </div>

              {q.expected_answer && (
                <div className="mt-3 pl-6 border-l-2 border-emerald/30">
                  <div className="flex items-center gap-1.5 mb-1">
                    <CheckCircle size={12} className="text-emerald" />
                    <span className="text-[10px] text-emerald uppercase tracking-wider font-semibold">Expected Answer</span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">{q.expected_answer}</p>
                </div>
              )}

              {q.follow_up && (
                <div className="mt-2 pl-6">
                  <span className="text-[10px] text-blue-400 uppercase tracking-wider font-semibold">Follow-up: </span>
                  <span className="text-xs text-gray-400">{q.follow_up}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {questions.interview_tips && (
          <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <h4 className="text-xs font-semibold text-amber-400 mb-2 uppercase tracking-wider">Interview Tips</h4>
            <ul className="text-xs text-gray-400 space-y-1">
              {questions.interview_tips.map((tip: string, i: number) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => {
              const content = `Interview Questions for ${candidateName}\n\n${questions.questions.map((q: any, i: number) => 
                `${i + 1}. ${q.question}\nCategory: ${q.category}\n${q.difficulty ? `Difficulty: ${q.difficulty}\n` : ''}Expected Answer: ${q.expected_answer}\n${q.follow_up ? `Follow-up: ${q.follow_up}\n` : ''}`
              ).join('\n\n')}`;
              
              navigator.clipboard.writeText(content);
              alert('Questions copied to clipboard!');
            }}
            className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm"
          >
            Copy Questions
          </button>
          <button onClick={onClose} className="btn-outline flex-1 text-sm">
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}
