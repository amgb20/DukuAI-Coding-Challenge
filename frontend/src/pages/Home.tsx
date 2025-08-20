import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

const HomeContainer = styled.div`
  min-height: 100vh;
  background: #0a0e27;
  color: #e1e5f2;
  font-family: 'Courier New', monospace;
  line-height: 1.6;
`;

const Header = styled.header`
  background: linear-gradient(135deg, #1a1d3a, #2d3561);
  border-bottom: 2px solid #00ff88;
  padding: 20px 0;
`;

const HeaderContent = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Logo = styled.div`
  font-size: 1.8rem;
  font-weight: bold;
  color: #00ff88;
  display: flex;
  align-items: center;
  gap: 10px;
  
  &::before {
    content: '>';
    color: #00ff88;
  }
`;

const Version = styled.span`
  background: #00ff88;
  color: #0a0e27;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: bold;
`;

const MainContent = styled.main`
  max-width: 1400px;
  margin: 0 auto;
  padding: 40px 20px;
`;

const Title = styled.h1`
  font-size: 3rem;
  color: #00ff88;
  margin-bottom: 10px;
  font-weight: normal;
  
  &::before {
    content: '$ ';
    color: #666;
  }
`;

const Subtitle = styled.h2`
  font-size: 1.5rem;
  color: #8892b0;
  margin-bottom: 40px;
  font-weight: normal;
`;

const SectionGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
  margin-bottom: 60px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const Section = styled.section`
  background: #1a1d3a;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 30px;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #00ff88, #0070f3);
  }
`;

const SectionHeader = styled.h3`
  color: #00ff88;
  font-size: 1.3rem;
  margin-bottom: 20px;
  font-weight: normal;
  display: flex;
  align-items: center;
  gap: 10px;
  
  &::before {
    content: '//';
    color: #666;
  }
`;

const CodeBlock = styled.pre`
  background: #0f1419;
  border: 1px solid #333;
  border-radius: 4px;
  padding: 20px;
  overflow-x: auto;
  font-size: 0.9rem;
  color: #e1e5f2;
  margin: 20px 0;
`;

const MetricGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 15px;
  margin: 20px 0;
`;

const Metric = styled.div`
  background: #0f1419;
  border: 1px solid #333;
  border-radius: 4px;
  padding: 15px;
  text-align: center;
`;

const MetricValue = styled.div`
  color: #00ff88;
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 5px;
`;

const MetricLabel = styled.div`
  color: #8892b0;
  font-size: 0.8rem;
  text-transform: uppercase;
`;

const FeatureList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 20px 0;
`;

const FeatureItem = styled.li`
  padding: 8px 0;
  color: #e1e5f2;
  
  &::before {
    content: '→ ';
    color: #00ff88;
    font-weight: bold;
  }
`;

const TechStack = styled.div`
  background: #1a1d3a;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 30px;
  margin: 40px 0;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #0070f3, #7928ca);
  }
`;

const TechGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-top: 20px;
`;

const TechItem = styled.div`
  background: #0f1419;
  border: 1px solid #333;
  border-radius: 4px;
  padding: 20px;
  text-align: center;
`;

const TechName = styled.div`
  color: #00ff88;
  font-weight: bold;
  margin-bottom: 8px;
`;

const TechDescription = styled.div`
  color: #8892b0;
  font-size: 0.9rem;
`;

const CTASection = styled.div`
  text-align: center;
  margin: 60px 0;
  padding: 40px;
  background: linear-gradient(135deg, #1a1d3a, #2d3561);
  border: 1px solid #333;
  border-radius: 8px;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #00ff88, #0070f3, #7928ca);
  }
`;

const CTAButton = styled(Link)`
  display: inline-block;
  background: linear-gradient(135deg, #00ff88, #0070f3);
  color: #0a0e27;
  padding: 15px 40px;
  border-radius: 4px;
  text-decoration: none;
  font-weight: bold;
  font-family: 'Courier New', monospace;
  transition: all 0.3s ease;
  border: 2px solid transparent;
  
  &:hover {
    background: linear-gradient(135deg, #0070f3, #7928ca);
    color: white;
    transform: translateY(-2px);
  }
  
  &::before {
    content: '$ ';
  }
`;

const Home: React.FC = () => {
  return (
    <HomeContainer>
      <Header>
        <HeaderContent>
          <Logo>DukuAI</Logo>
          <Version>v2.0.0</Version>
        </HeaderContent>
      </Header>

      <MainContent>
        <Title>image-comparison-engine</Title>
        <Subtitle>Advanced pixel-level difference detection with SSIM, MSE, and visual analytics</Subtitle>

        <CTASection>
          <SectionHeader>Launch Image Comparison Engine</SectionHeader>
          <CTAButton to="/tech">
            Initialize Tool
          </CTAButton>
        </CTASection>

        <SectionGrid>
          <Section>
            <SectionHeader>Core Algorithm</SectionHeader>
            <CodeBlock>{`# Multi-Algorithm Analysis
1. Structural Similarity Index (SSIM)
2. Mean Squared Error (MSE) 
3. Pixel Difference Analysis

# Weighted Scoring Formula
final_score = (
  pixel_diff_percentage * 0.6 +
  (1 - ssim_score) * 100 * 0.3 +
  normalized_mse * 0.1
)`}</CodeBlock>
            <MetricGrid>
              <Metric>
                <MetricValue>0-100%</MetricValue>
                <MetricLabel>Difference Score</MetricLabel>
              </Metric>
              <Metric>
                <MetricValue>&lt;400ms</MetricValue>
                <MetricLabel>Processing Time</MetricLabel>
              </Metric>
            </MetricGrid>
          </Section>

          <Section>
            <SectionHeader>Performance Metrics</SectionHeader>
            <FeatureList>
              <FeatureItem>Small images (100x100px): ~50-150ms</FeatureItem>
              <FeatureItem>Medium images (500x500px): ~200-500ms</FeatureItem>
              <FeatureItem>Large images (1920x1080px): ~800-2000ms</FeatureItem>
              <FeatureItem>Maximum support: 2048x2048px</FeatureItem>
            </FeatureList>
            <MetricGrid>
              <Metric>
                <MetricValue>10MB</MetricValue>
                <MetricLabel>Max File Size</MetricLabel>
              </Metric>
              <Metric>
                <MetricValue>5</MetricValue>
                <MetricLabel>Image Formats</MetricLabel>
              </Metric>
            </MetricGrid>
          </Section>

          <Section>
            <SectionHeader>REST API Endpoints</SectionHeader>
            <CodeBlock>{`POST /comparison
GET  /comparison/{id}
GET  /comparisons?limit=50&offset=0
GET  /comparisons/stats
DELETE /comparison/{id}
GET  /health`}</CodeBlock>
            <FeatureList>
              <FeatureItem>Multipart form data upload</FeatureItem>
              <FeatureItem>Automatic visualization generation</FeatureItem>
              <FeatureItem>Database persistence</FeatureItem>
              <FeatureItem>OpenAPI documentation</FeatureItem>
            </FeatureList>
          </Section>

          <Section>
            <SectionHeader>Visual Output Generation</SectionHeader>
            <FeatureList>
              <FeatureItem>Heatmap: Color-coded intensity mapping</FeatureItem>
              <FeatureItem>Overlay: Red highlights on changed regions</FeatureItem>
              <FeatureItem>Binary Mask: Threshold-based detection</FeatureItem>
              <FeatureItem>Base64 encoded PNG format</FeatureItem>
            </FeatureList>
            <MetricGrid>
              <Metric>
                <MetricValue>50-200KB</MetricValue>
                <MetricLabel>Visualization Size</MetricLabel>
              </Metric>
              <Metric>
                <MetricValue>RGB</MetricValue>
                <MetricLabel>Color Space</MetricLabel>
              </Metric>
            </MetricGrid>
          </Section>
        </SectionGrid>

        <TechStack>
          <SectionHeader>Technology Stack</SectionHeader>
          <TechGrid>
            <TechItem>
              <TechName>React 18 + TypeScript</TechName>
              <TechDescription>Frontend with type safety</TechDescription>
            </TechItem>
            <TechItem>
              <TechName>FastAPI + Python</TechName>
              <TechDescription>High-performance backend</TechDescription>
            </TechItem>
            <TechItem>
              <TechName>OpenCV + PIL</TechName>
              <TechDescription>Computer vision processing</TechDescription>
            </TechItem>
            <TechItem>
              <TechName>PostgreSQL</TechName>
              <TechDescription>Async database operations</TechDescription>
            </TechItem>
            <TechItem>
              <TechName>Redis</TechName>
              <TechDescription>Caching and sessions</TechDescription>
            </TechItem>
            <TechItem>
              <TechName>Docker + Nginx</TechName>
              <TechDescription>Containerized deployment</TechDescription>
            </TechItem>
          </TechGrid>
        </TechStack>
      </MainContent>
    </HomeContainer>
  );
};

export default Home;
