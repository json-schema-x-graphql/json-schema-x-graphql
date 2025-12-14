package main

import (
	"log"
	"net/http"
	"os"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/gsa-tts/schema-unification-project/gqlgen-poc/graph"
)

const defaultPort = "8080"

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = defaultPort
	}

	srv := handler.NewDefaultServer(graph.NewExecutableSchema(graph.Config{Resolvers: &graph.Resolver{}}))

	// GraphQL Playground (disable in production)
	if os.Getenv("GRAPHQL_PLAYGROUND") != "false" {
		http.Handle("/", playground.Handler("GraphQL Playground", "/query"))
		log.Println("GraphQL Playground available at http://localhost:" + port + "/")
	}

	// GraphQL endpoint
	http.Handle("/query", srv)

	// Health check endpoint for cloud.gov
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	log.Printf("Server starting on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
