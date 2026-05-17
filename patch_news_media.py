with open('src/pages/NewsMedia.jsx', 'r') as f:
    content = f.read()

# 1. Update featured media title
content = content.replace(
    '<p className="text-text-muted text-sm leading-relaxed">Now Playing: The Ethics of Algorithms</p>',
    '<p className="text-text-muted text-sm leading-relaxed">Now Playing: The All-American Tax Credit vs. Reactive Welfare Structures</p>'
)

# 2. Fix FrequencyVisualizer
old_visualizer = """const FrequencyVisualizer = ({ isPlaying }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const bars = 20;
      const barWidth = canvas.width / bars - 2;

      for (let i = 0; i < bars; i++) {
        const barHeight = isPlaying ? Math.random() * (canvas.height - 10) + 10 : 5;
        const x = i * (barWidth + 2);
        const y = canvas.height - barHeight;

        ctx.fillStyle = isPlaying ? '#4ade80' : '#4ade80';
        ctx.fillRect(x, y, barWidth, barHeight);
      }

      if (isPlaying) {
        animationFrameId = requestAnimationFrame(render);
      } else {
        animationFrameId = setTimeout(() => requestAnimationFrame(render), 500);
      }
    };

    render();

    return () => {
      if (isPlaying) cancelAnimationFrame(animationFrameId);
      else clearTimeout(animationFrameId);
    };
  }, [isPlaying]);

  return <canvas ref={canvasRef} width="200" height="60" className="w-full h-full opacity-50" />;
};"""

new_visualizer = """const FrequencyVisualizer = ({ isPlaying }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const bars = 20;
      const barWidth = canvas.width / bars - 2;

      for (let i = 0; i < bars; i++) {
        const barHeight = isPlaying ? Math.random() * (canvas.height - 10) + 10 : 5;
        const x = i * (barWidth + 2);
        const y = canvas.height - barHeight;

        ctx.fillStyle = isPlaying ? '#fde047' : '#4ade80';
        ctx.fillRect(x, y, barWidth, barHeight);
      }

      if (isPlaying) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isPlaying]);

  return <canvas ref={canvasRef} width="200" height="60" className="w-full h-full opacity-50" />;
};"""

content = content.replace(old_visualizer, new_visualizer)

# 3. Sanitize mapped titles and external image parameters
# Titles are rendered as: {stripHtml(post.title.rendered)}
# Let's change this to use DOMPurify.sanitize as well. DOMPurify is already imported.
content = content.replace(
    '{stripHtml(post.title.rendered)}',
    '<span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(stripHtml(post.title.rendered)) }} />'
)
content = content.replace(
    '{stripHtml(post.excerpt.rendered)}',
    '<span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(stripHtml(post.excerpt.rendered)) }} />'
)

# For external image parameter sanitization, we need to find `<img src={post.imageUrl}`
content = content.replace(
    '<img src={post.imageUrl}',
    '<img src={DOMPurify.sanitize(post.imageUrl)}'
)

with open('src/pages/NewsMedia.jsx', 'w') as f:
    f.write(content)
