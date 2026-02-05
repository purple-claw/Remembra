import { useState } from 'react';
import { mockAITools, mockMemoryItems } from '@/data/mockData';
import { 
  Sparkles, 
  FileText, 
  GitBranch, 
  HelpCircle, 
  Home, 
  MessageCircle,
  ArrowLeft,
  Send,
  Copy,
  Download,
  Check,
  Wand2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function AIStudio() {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: "Hi! I'm your AI study buddy. I can help explain concepts, create analogies, or answer questions about your learning materials. What would you like to explore?" }
  ]);
  const [chatInput, setChatInput] = useState('');

  const handleToolSelect = (toolId: string) => {
    setActiveTool(toolId);
    setInputText('');
    setResult(null);
  };

  const handleProcess = () => {
    if (!inputText.trim()) {
      toast.error('Please enter some text');
      return;
    }
    
    setIsProcessing(true);
    
    setTimeout(() => {
      let output = '';
      
      switch (activeTool) {
        case 'summarizer':
          output = generateSummary();
          break;
        case 'flowchart':
          output = generateFlowchart();
          break;
        case 'quiz':
          output = generateQuiz();
          break;
        case 'memory-palace':
          output = generateMemoryPalace(inputText);
          break;
      }
      
      setResult(output);
      setIsProcessing(false);
      toast.success('Processing complete!');
    }, 2000);
  };

  const generateSummary = () => {
    return `## Key Points

• The content covers fundamental concepts essential for understanding
• Main components include structure, behavior, and relationships
• Key benefits: improved efficiency, better organization, enhanced learning
• Common applications in real-world scenarios

## Important Terms

1. **Core Concept** - The foundational principle
2. **Implementation** - How to apply in practice  
3. **Optimization** - Improving performance

## Review Questions

• What are the three main components?
• How would you explain this to a beginner?
• What are common pitfalls to avoid?`;
  };

  const generateFlowchart = () => {
    return '```mermaid\ngraph TD\n    A[Start] --> B{Understand Problem}\n    B -->|Yes| C[Break Down]\n    B -->|No| D[Research]\n    D --> B\n    C --> E[Create Plan]\n    E --> F[Execute]\n    F --> G{Test?}\n    G -->|Pass| H[Complete]\n    G -->|Fail| I[Debug]\n    I --> F\n    H --> J[Review & Optimize]\n```';
  };

  const generateQuiz = () => {
    return `## Practice Quiz

**Question 1:** What is the primary purpose of this concept?
- A) To complicate processes
- B) To simplify and organize
- C) To increase complexity
- D) To reduce efficiency

**Question 2:** Which of the following is NOT a key component?
- A) Structure
- B) Behavior  
- C) Randomness
- D) Relationships

**Question 3:** When should you apply this?
- A) Never
- B) Only in theory
- C) When organizing complex systems
- D) Only for experts`;
  };

  const generateMemoryPalace = (text: string) => {
    const items = text.split(',').map(s => s.trim()).filter(s => s);
    return `## Your Memory Palace: The Modern House

**Journey Path:**

1. **Front Door** -> "${items[0] || 'First Item'}"
   - Visualize a giant ${items[0] || 'object'} blocking the entrance

2. **Living Room** -> "${items[1] || 'Second Item'}"
   - See ${items[1] || 'it'} sitting on the couch watching TV

3. **Kitchen** -> "${items[2] || 'Third Item'}"
   - Imagine ${items[2] || 'something'} cooking on the stove

4. **Bedroom** -> "${items[3] || 'Fourth Item'}"
   - Picture ${items[3] || 'an item'} sleeping in your bed

5. **Bathroom** -> "${items[4] || 'Fifth Item'}"
   - Visualize ${items[4] || 'the last item'} taking a bath

**Tips:**
• Make images exaggerated and unusual
• Use all your senses
• Practice the journey daily`;
  };

  const handleChatSend = () => {
    if (!chatInput.trim()) return;
    
    const newMessage: ChatMessage = { role: 'user', content: chatInput };
    setChatMessages([...chatMessages, newMessage]);
    setChatInput('');
    
    setTimeout(() => {
      const responses = [
        "That's a great question! Let me break this down for you...",
        "Think of it like this: imagine you're organizing a library...",
        "The key insight here is understanding the relationship between...",
        "Here's an analogy that might help: it's like building with LEGO blocks...",
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: randomResponse + " This concept builds on what you learned earlier. Would you like me to create some practice questions?"
      }]);
    }, 1500);
  };

  const copyToClipboard = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      toast.success('Copied to clipboard!');
    }
  };

  if (activeTool && activeTool !== 'chat') {
    const tool = mockAITools.find(t => t.id === activeTool);
    if (!tool) return null;

    return (
      <div className="min-h-screen bg-remembra-bg-primary flex flex-col">
        <header className="px-5 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <button 
              onClick={() => setActiveTool(null)}
              className="w-10 h-10 rounded-xl bg-remembra-bg-secondary flex items-center justify-center text-remembra-text-secondary hover:text-remembra-text-primary transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${tool.color}20` }}
            >
              {tool.id === 'summarizer' && <FileText size={20} style={{ color: tool.color }} />}
              {tool.id === 'flowchart' && <GitBranch size={20} style={{ color: tool.color }} />}
              {tool.id === 'quiz' && <HelpCircle size={20} style={{ color: tool.color }} />}
              {tool.id === 'memory-palace' && <Home size={20} style={{ color: tool.color }} />}
            </div>
            
            <div>
              <h1 className="text-xl font-bold text-remembra-text-primary">{tool.name}</h1>
              <p className="text-sm text-remembra-text-muted">{tool.description}</p>
            </div>
          </div>
        </header>

        <main className="flex-1 px-5 py-4 overflow-y-auto">
          {!result ? (
            <div className="space-y-4 animate-slide-up">
              <div>
                <label className="block text-sm font-medium text-remembra-text-secondary mb-2">
                  Input
                </label>
                <Textarea
                  placeholder={
                    activeTool === 'summarizer' ? 'Paste text to summarize...' :
                    activeTool === 'flowchart' ? 'Describe a process to visualize...' :
                    activeTool === 'quiz' ? 'Enter content to generate quiz...' :
                    'Enter items to remember (comma-separated)...'
                  }
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="bg-remembra-bg-secondary border-white/5 rounded-xl text-remembra-text-primary placeholder:text-remembra-text-muted focus:border-remembra-accent-primary/50 min-h-[200px] resize-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-remembra-text-secondary mb-2">
                  Or select from library
                </label>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                  {mockMemoryItems.slice(0, 4).map(item => (
                    <button
                      key={item.id}
                      onClick={() => setInputText(item.content)}
                      className="flex-shrink-0 px-3 py-2 bg-remembra-bg-secondary rounded-lg text-xs text-remembra-text-secondary hover:text-remembra-text-primary border border-white/5"
                    >
                      {item.title}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-slide-up">
              <div className="bg-remembra-bg-secondary rounded-2xl p-5 border border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-remembra-text-primary">Result</h3>
                  <div className="flex gap-2">
                    <button 
                      onClick={copyToClipboard}
                      className="p-2 rounded-lg bg-remembra-bg-tertiary text-remembra-text-secondary hover:text-remembra-text-primary"
                    >
                      <Copy size={16} />
                    </button>
                    <button className="p-2 rounded-lg bg-remembra-bg-tertiary text-remembra-text-secondary hover:text-remembra-text-primary">
                      <Download size={16} />
                    </button>
                  </div>
                </div>
                
                <pre className="text-sm text-remembra-text-secondary whitespace-pre-wrap font-mono">
                  {result}
                </pre>
              </div>
              
              <div className="flex gap-3">
                <Button
                  onClick={() => setResult(null)}
                  variant="outline"
                  className="flex-1 border-white/10 text-remembra-text-secondary"
                >
                  Start Over
                </Button>
                <Button
                  onClick={() => toast.success('Saved to item!')}
                  className="flex-1 gradient-primary"
                >
                  <Check size={16} className="mr-2" />
                  Save to Item
                </Button>
              </div>
            </div>
          )}
        </main>

        {!result && (
          <footer className="px-5 pb-8 pt-4">
            <Button
              onClick={handleProcess}
              disabled={isProcessing || !inputText.trim()}
              className="w-full gradient-primary py-6 rounded-2xl text-white font-semibold disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Wand2 size={18} className="mr-2 animate-pulse" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles size={18} className="mr-2" />
                  Generate
                </>
              )}
            </Button>
          </footer>
        )}
      </div>
    );
  }

  if (activeTool === 'chat') {
    return (
      <div className="min-h-screen bg-remembra-bg-primary flex flex-col">
        <header className="px-5 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setActiveTool(null)}
              className="w-10 h-10 rounded-xl bg-remembra-bg-secondary flex items-center justify-center text-remembra-text-secondary hover:text-remembra-text-primary transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            
            <div className="w-10 h-10 rounded-xl bg-remembra-accent-pink/20 flex items-center justify-center">
              <MessageCircle size={20} className="text-remembra-accent-pink" />
            </div>
            
            <div>
              <h1 className="text-xl font-bold text-remembra-text-primary">Study Buddy</h1>
              <p className="text-sm text-remembra-text-muted">AI tutor for your learning materials</p>
            </div>
          </div>
        </header>

        <main className="flex-1 px-5 py-4 overflow-y-auto">
          <div className="space-y-4">
            {chatMessages.map((message, index) => (
              <div 
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[80%] p-4 rounded-2xl ${
                    message.role === 'user' 
                      ? 'bg-remembra-accent-primary text-white' 
                      : 'bg-remembra-bg-secondary text-remembra-text-primary'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                </div>
              </div>
            ))}
          </div>
        </main>

        <footer className="px-5 pb-8 pt-4">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Ask anything..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleChatSend()}
              className="flex-1 bg-remembra-bg-secondary border-white/5 rounded-xl text-remembra-text-primary placeholder:text-remembra-text-muted focus:border-remembra-accent-primary/50 py-6"
            />
            <button
              onClick={handleChatSend}
              disabled={!chatInput.trim()}
              className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center text-white disabled:opacity-50"
            >
              <Send size={18} />
            </button>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-remembra-bg-primary px-5 pt-6 pb-24">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-remembra-text-primary mb-1">AI Studio</h1>
        <p className="text-remembra-text-muted">Supercharge your learning with AI</p>
      </header>

      <div className="grid grid-cols-2 gap-4">
        {mockAITools.map((tool, index) => {
          const icons: Record<string, React.ElementType> = {
            summarizer: FileText,
            flowchart: GitBranch,
            quiz: HelpCircle,
            'memory-palace': Home,
            chat: MessageCircle,
          };
          const Icon = icons[tool.id] || Sparkles;
          
          return (
            <button
              key={tool.id}
              onClick={() => handleToolSelect(tool.id)}
              className="bg-remembra-bg-secondary rounded-2xl p-5 border border-white/5 text-left card-press hover:border-white/10 transition-colors animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{ backgroundColor: `${tool.color}20` }}
              >
                <Icon size={24} style={{ color: tool.color }} />
              </div>
              
              <h3 className="font-semibold text-remembra-text-primary mb-1">{tool.name}</h3>
              <p className="text-xs text-remembra-text-muted">{tool.description}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-remembra-text-primary mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {[
            { tool: 'Smart Summary', item: 'React Hooks Deep Dive', time: '2 hours ago' },
            { tool: 'Quiz Generator', item: 'Spanish Verbs', time: 'Yesterday' },
            { tool: 'Visual Mapper', item: 'Photosynthesis Process', time: '2 days ago' },
          ].map((activity, index) => (
            <div 
              key={index}
              className="flex items-center gap-4 p-4 bg-remembra-bg-secondary rounded-2xl border border-white/5"
            >
              <div className="w-10 h-10 rounded-xl bg-remembra-accent-primary/10 flex items-center justify-center">
                <Sparkles size={18} className="text-remembra-accent-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-remembra-text-primary">{activity.tool}</p>
                <p className="text-xs text-remembra-text-muted">{activity.item}</p>
              </div>
              <span className="text-xs text-remembra-text-muted">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
