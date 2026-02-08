import React from 'react';
import { Award, Clock, Leaf } from 'lucide-react';

const AboutSection = () => {
  const features = [
    {
      icon: Award,
      title: 'Premium Quality',
      description: 'Only the freshest ingredients from trusted local suppliers',
    },
    {
      icon: Clock,
      title: 'Fast Service',
      description: 'Quick preparation without compromising on quality',
    },
    {
      icon: Leaf,
      title: 'Fresh Daily',
      description: 'All our food is prepared fresh every single day',
    },
  ];

  return (
    <section id="about" className="section-padding bg-background">
      <div className="container mx-auto max-w-3xl text-center">
          {/* Content */}
          <div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold mb-6 leading-tight">
              Where Every Bite is a{' '}
              <span className="text-primary">Celebration</span>
            </h2>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Born from a passion for perfect fried chicken, Cluck Bite has been serving up 
              crispy, juicy, and absolutely delicious chicken since day one. Our secret? 
              Premium ingredients, time-honored recipes, and a whole lot of love.
            </p>

            {/* Feature Cards */}
            <div className="grid sm:grid-cols-3 gap-4 text-left">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="p-5 rounded-xl bg-muted/50 border border-border/50 hover:border-primary/30 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-medium mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
      </div>
    </section>
  );
};

export default AboutSection;
