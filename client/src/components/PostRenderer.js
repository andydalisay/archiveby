import { useTheme } from '../ThemeContext';
import { supabase } from '../supabaseClient';

function PostRenderer({ post }) {
  const { colors } = useTheme();

  // Handle old text-only posts
  if (!post.title && !post.blocks) {
    return (
      <p style={{ ...styles(colors).text, margin: 0 }}>
        {post.content}
      </p>
    );
  }

  const getOptimizedImageUrl = (url) => {
    try {
      // Extract the file path from the full URL
      // URL format: https://.../storage/v1/object/public/posts/post-images/filename.jpg
      const urlParts = url.split('/object/public/posts/');

      if (urlParts.length < 2) {
        // If we can't parse it, return original URL
        return url;
      }

      const filePath = urlParts[1];

      // Use Supabase's transform feature to serve optimized WebP images
      const { data } = supabase.storage
        .from('posts')
        .getPublicUrl(filePath, {
          transform: {
            width: 800,
            format: 'webp',
            quality: 80,
          }
        });

      return data.publicUrl;
    } catch (error) {
      console.error('Error optimizing image URL:', error);
      return url; // Return original URL as fallback
    }
  };

  const renderBlock = (block) => {
    switch (block.type) {
      case 'text':
        return (
          <div key={block.id} style={styles(colors).textBlock}>
            {block.content}
          </div>
        );

      case 'image':
        return (
          <div key={block.id} style={styles(colors).imageBlock}>
            <img
              src={block.settings.url}
              alt="Post content"
              onError={(e) => {
                console.error('Image failed to load:', block.settings.url);
                console.error('Error:', e);
              }}
              style={{
                ...styles(colors).image,
                aspectRatio: block.settings.shape === 'square' ? '1/1' :
                            block.settings.shape === '4:3' ? '4/3' : '16/9',
                borderRadius: block.settings.rounded ? '16px' :
                             block.settings.shape === 'polaroid' ? '8px' : '0',
                padding: block.settings.shape === 'polaroid' ? '12px 12px 40px 12px' : '0',
                backgroundColor: block.settings.shape === 'polaroid' ? 'white' : 'transparent',
                boxShadow: block.settings.shape === 'polaroid' ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
              }}
            />
          </div>
        );

      case 'divider':
        return <hr key={block.id} style={styles(colors).divider} />;

      case 'list':
        return (
          <ul key={block.id} style={styles(colors).list}>
            {block.settings.items.filter(item => item.trim()).map((item, i) => (
              <li key={i} style={styles(colors).listItem}>
                {item}
              </li>
            ))}
          </ul>
        );

      case 'checklist':
        return (
          <div key={block.id} style={styles(colors).checklist}>
            {block.settings.items.filter(item => item.trim()).map((item, i) => (
              <div key={i} style={styles(colors).checklistItem}>
                <input
                  type="checkbox"
                  style={styles(colors).checkbox}
                  disabled
                />
                <span>{item}</span>
              </div>
            ))}
          </div>
        );

      case 'map':
        return (
          <div key={block.id} style={styles(colors).mapBlock}>
            <div style={styles(colors).mapDisplay}>
              📍 {block.content}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={styles(colors).container}>
      {post.title && (
        <h2 style={styles(colors).title}>{post.title}</h2>
      )}

      {/* Travel metadata chips */}
      {(post.country || post.duration || post.trip_type) && (
        <div style={styles(colors).chipsContainer}>
          {post.country && (
            <span style={styles(colors).chip}>
              📍 {post.country}
            </span>
          )}
          {post.duration && (
            <span style={styles(colors).chip}>
              ⏱️ {post.duration}
            </span>
          )}
          {post.trip_type && (
            <span style={{...styles(colors).chip, ...styles(colors)[`chip${post.trip_type}`]}}>
              {getTripTypeIcon(post.trip_type)} {post.trip_type}
            </span>
          )}
        </div>
      )}

      <div style={styles(colors).blocks}>
        {post.blocks?.map(block => renderBlock(block))}
      </div>

      {/* Hashtags */}
      {post.hashtags && (
        <div style={styles(colors).hashtagsContainer}>
          {post.hashtags.split(' ').filter(tag => tag.trim()).map((tag, index) => (
            <span key={index} style={styles(colors).hashtag}>
              {tag.startsWith('#') ? tag : `#${tag}`}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

const getTripTypeIcon = (type) => {
  switch(type) {
    case 'Luxury': return '✨';
    case 'Adventure': return '🏔️';
    case 'Casual': return '🌴';
    case 'Wellness': return '🧘';
    case 'Eco': return '🌿';
    default: return '🌍';
  }
};

const styles = (colors) => ({
  container: {
    width: '100%',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 'bold',
    marginBottom: '1rem',
    color: colors.text,
    lineHeight: '1.3',
  },
  chipsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
    marginBottom: '1.25rem',
  },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0.5rem 1rem',
    background: colors.background,
    border: `1.5px solid ${colors.border}`,
    borderRadius: '20px',
    fontSize: '0.85rem',
    fontWeight: '600',
    color: colors.text,
  },
  chipLuxury: {
    background: '#fff5e6',
    borderColor: '#ffa726',
    color: '#e65100',
  },
  chipAdventure: {
    background: '#e8f5e9',
    borderColor: '#66bb6a',
    color: '#2e7d32',
  },
  chipCasual: {
    background: '#e3f2fd',
    borderColor: '#42a5f5',
    color: '#1565c0',
  },
  chipWellness: {
    background: '#f3e5f5',
    borderColor: '#ab47bc',
    color: '#6a1b9a',
  },
  chipEco: {
    background: '#e0f2f1',
    borderColor: '#26a69a',
    color: '#00695c',
  },
  blocks: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  hashtagsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
    marginTop: '1.25rem',
    paddingTop: '1.25rem',
    borderTop: `1px solid ${colors.border}`,
  },
  hashtag: {
    fontSize: '0.9rem',
    color: colors.pink,
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'opacity 0.2s ease',
  },
  text: {
    color: colors.text,
    lineHeight: '1.6',
  },
  textBlock: {
    fontSize: '1rem',
    lineHeight: '1.7',
    color: colors.text,
    whiteSpace: 'pre-wrap',
  },
  imageBlock: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    margin: '0.5rem 0',
  },
  image: {
    width: '100%',
    maxWidth: '700px',
    objectFit: 'cover',
    display: 'block',
  },
  divider: {
    border: 'none',
    borderTop: `2px solid ${colors.border}`,
    margin: '1.5rem 0',
  },
  list: {
    margin: '0.5rem 0',
    paddingLeft: '1.5rem',
    listStyleType: 'none',
  },
  listItem: {
    position: 'relative',
    padding: '0.35rem 0',
    color: colors.text,
    fontSize: '0.95rem',
    lineHeight: '1.6',
    paddingLeft: '1.25rem',
    '::before': {
      content: '"•"',
      color: colors.pink,
      fontWeight: 'bold',
      fontSize: '1.2rem',
      position: 'absolute',
      left: 0,
    },
  },
  checklist: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  checklistItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    fontSize: '0.95rem',
    color: colors.text,
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'not-allowed',
  },
  mapBlock: {
    margin: '0.5rem 0',
  },
  mapDisplay: {
    padding: '2rem',
    background: colors.pinkLight,
    border: `1.5px solid ${colors.pink}`,
    borderRadius: '10px',
    textAlign: 'center',
    fontSize: '1.1rem',
    color: colors.navy,
    fontWeight: '600',
  },
});

export default PostRenderer;
